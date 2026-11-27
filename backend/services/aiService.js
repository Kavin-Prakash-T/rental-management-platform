import groq, { GROQ_MODEL } from "../config/groq.js";
import { findDirectFaqMatch, getRelevantContext } from "./faqChatService.js";
import { buildChatbotPrompt, buildAdminInsightsPrompt } from "../utils/prompts.js";
import {
  businessToolsDefinition,
  executeAnalyticsTool,
  detectIntentTool,
} from "./businessChatService.js";

export const processChatMessage = async ({ message, history = [] }) => {
  const directMatch = await findDirectFaqMatch(message);

  if (directMatch) {
    return {
      message: directMatch.answer,
      source: "faq_direct",
      matchedFaq: {
        id: directMatch._id,
        question: directMatch.question,
        category: directMatch.category,
      },
      tokensUsed: 0,
    };
  }

  const context = await getRelevantContext(message);
  const systemPrompt = buildChatbotPrompt(context);

  const formattedHistory = (history || []).slice(-6).map((msg) => ({
    role: msg.role === "assistant" ? "assistant" : "user",
    content: msg.content,
  }));

  const messages = [
    { role: "system", content: systemPrompt },
    ...formattedHistory,
    { role: "user", content: message },
  ];

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      max_tokens: 350,
      temperature: 0.2,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I am currently unable to provide an answer. Please contact our support team.";

    return {
      message: reply,
      source: "groq_llm",
      tokensUsed: completion.usage?.total_tokens || 0,
    };
  } catch (error) {
    const businessName = context.business?.businessName || "RentSphere Event Rentals";
    const phone = context.business?.phone || "";
    const email = context.business?.email || "";

    const contactStr = [
      phone ? `phone at ${phone}` : "",
      email ? `email at ${email}` : "",
    ]
      .filter(Boolean)
      .join(" or ");

    return {
      message: `Thank you for reaching out to ${businessName}. We are currently experiencing high request volumes with our automated assistant. Please contact us directly by ${contactStr || "phone or email"} for immediate assistance.`,
      source: "fallback",
      tokensUsed: 0,
      error: error.message,
    };
  }
};

export const processAdminChatMessage = async ({ message, history = [] }) => {
  const formattedHistory = (history || []).slice(-6).map((msg) => ({
    role: msg.role === "assistant" ? "assistant" : "user",
    content: msg.content,
  }));

  const initialIntentTool = detectIntentTool(message);
  let toolExecutionResult = null;
  let executedToolName = null;

  if (initialIntentTool) {
    executedToolName = initialIntentTool.name;
    toolExecutionResult = await executeAnalyticsTool(initialIntentTool.name, initialIntentTool.args);
  }

  const systemPrompt = buildAdminInsightsPrompt(
    toolExecutionResult
      ? JSON.stringify({ tool: executedToolName, result: toolExecutionResult }, null, 2)
      : ""
  );

  const messages = [
    { role: "system", content: systemPrompt },
    ...formattedHistory,
    { role: "user", content: message },
  ];

  try {
    const callOptions = {
      model: GROQ_MODEL,
      messages,
      max_tokens: 600,
      temperature: 0.2,
    };

    if (!toolExecutionResult) {
      callOptions.tools = businessToolsDefinition;
      callOptions.tool_choice = "auto";
    }

    const firstCall = await groq.chat.completions.create(callOptions);
    const choice = firstCall.choices?.[0];

    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      const fnName = toolCall.function?.name;
      let fnArgs = {};
      try {
        fnArgs = JSON.parse(toolCall.function?.arguments || "{}");
      } catch {
        fnArgs = {};
      }

      executedToolName = fnName;
      toolExecutionResult = await executeAnalyticsTool(fnName, fnArgs);

      const followupMessages = [
        ...messages,
        choice.message,
        {
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolExecutionResult),
        },
      ];

      const secondCall = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: followupMessages,
        max_tokens: 600,
        temperature: 0.2,
      });

      const reply = secondCall.choices?.[0]?.message?.content?.trim() || "";
      return {
        message: reply,
        toolUsed: executedToolName,
        toolData: toolExecutionResult,
        tokensUsed: (firstCall.usage?.total_tokens || 0) + (secondCall.usage?.total_tokens || 0),
        source: "groq_llm",
      };
    }

    const reply = choice?.message?.content?.trim() || "";
    return {
      message: reply,
      toolUsed: executedToolName,
      toolData: toolExecutionResult,
      tokensUsed: firstCall.usage?.total_tokens || 0,
      source: "groq_llm",
    };
  } catch (error) {
    if (toolExecutionResult) {
      return {
        message: `I retrieved the relevant business data from your database, though the natural-language synthesis encountered an upstream connectivity notice:\n\n${JSON.stringify(toolExecutionResult, null, 2)}`,
        toolUsed: executedToolName,
        toolData: toolExecutionResult,
        source: "analytics_direct",
        error: error.message,
      };
    }
    return {
      message: "An error occurred while compiling business insights. Please verify database connectivity or try again shortly.",
      source: "fallback",
      error: error.message,
    };
  }
};
