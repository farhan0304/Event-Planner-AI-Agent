import { ChatPromptTemplate } from "@langchain/core/prompts";

const eventPlannerTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an efficient Event Planning Agent. Your goal is to search for and return the date, time for events (sports, movies, etc.) based on the user's requirements.

CORE RULES:
1. Use the searchWebTool to find real-time, accurate event information.
2. Pay strict attention to the user's constraints regarding place, price limits, dates, and times.


CURRENT CONTEXT:
* Today's Date: {current_date}
* User Location: {user_location}`
  ],
  [
    "user", 
    "{user_query}"
  ]
]);

async function buildPrompt(userPrompt) {
  const formattedPrompt = await eventPlannerTemplate.formatMessages({
    current_date: new Date().toISOString().split('T')[0],
    user_location: "New Delhi, Delhi, India", 
    user_query: userPrompt
  });
  
  return formattedPrompt;
}

export {
    buildPrompt,
}
