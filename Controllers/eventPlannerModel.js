import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools"
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { buildPrompt } from "./Prompt.js";
import { z } from "zod";
import axios from "axios";
import "dotenv/config";
import { extractMovieDetails,extractDetailedMovieUrl,extractUniversalGoogleResults } from '../Tools/ExtractShowDetails.js'
import { fetchWebPage } from '../Tools/FetchWebPage.js'


const apiKey = process.env.GOOGLE_API_KEY;


const agentModel = new ChatGoogleGenerativeAI(
    {
        model: "gemini-3.5-flash",
        temperature: 0.4,
        apiKey
    }
)

// Tool to search the web for event details, dates, and times using the Scrape.do API
const searchWebTool = tool(
  async ({ url }) => {
    console.log(`[LangChain Tool] Searching web for: '${url}'`);

    try {
        const data = await fetchWebPage(url)

        if (url.match(/district\.in\//)) {

        } 
        else if (url.match(/google\.com\/search/)) {
          const detailedMovieUrl = extractDetailedMovieUrl(data);
          
          if (detailedMovieUrl && detailedMovieUrl.match(/district\.in\//)) {
            const cleanUrl = detailedMovieUrl
            .replace(/^\\+"/, '')
            .replace(/\\+"$/, '');
            console.log("[Search Web Tool] District URL extracted: ",cleanUrl);
            const rawMovieData = await fetchWebPage(cleanUrl);
            const movieDetails = extractMovieDetails(rawMovieData);
            
            const structuredData =  JSON.stringify(movieDetails, null, 2)
            return structuredData;

          }else {
            console.log("[Search Web Tool] URL extracted: ",detailedMovieUrl)
            const universalResults = extractUniversalGoogleResults(data);
            const structuredData =  JSON.stringify(universalResults, null, 2)
            return structuredData;
          }
        }
        else {
          console.log(data.substring(0,data.length<100?data.length:100))
          return data;
        }


    } catch (error) {
        console.error("Error searching web for event details:", error);
        throw error;
    }
  
  },
  {
    name: "searchWebForEvent",
    description: "Searches the web for event details, dates, and times.",
    schema: z.object({
      url: z.string().describe("The URL to search for event details. The URL to search for event details. Allowed base urls are: https://www.district.in/movies/, https://www.google.com/search"),
    }),
  }
);

// description("The URL to search for event details. The URL to search for event details. Allowed base urls are: https://www.district.in/movies/, https://www.google.com/search")

const eventSummarySchema = z.object({
  event_name: z.string(),
  start_date: z.string(),
  event_time: z.string(),
  event_description: z.string().describe("A brief description of the event, including any relevant details.")
});

const modelWithTools = agentModel.bindTools([searchWebTool]);
const modelWithStructuredOutput = agentModel.withStructuredOutput(eventSummarySchema);


async function runAgent(prompt) {


  console.log("Starting LangChain Agent Execution...");
  const messages = await buildPrompt(prompt);

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const response = await modelWithTools.invoke(messages);
    console.log("[LangChain] Model response:", response.content);
    const assistantContent =
      typeof response.content === "string"
        ? response.content
        : Array.isArray(response.content)
          ? response.content.map(part => JSON.stringify(part)).join(" ")
          : String(response.content);

    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log("[LangChain] No tool calls returned. Finishing.");
      console.log("\n--- Final JSON Output (Fully Parsed Object) ---");
      console.log(response.content);
      messages.push(new AIMessage(assistantContent));
      const structuredResponse = await modelWithStructuredOutput.invoke(messages);
      return structuredResponse;
    }

    for (const toolCall of response.tool_calls) {
      console.log(`[LangChain] Tool call requested: ${toolCall.name}`);
      console.log(`[LangChain] Tool args: ${JSON.stringify(toolCall.args)}`);

      if (toolCall.name !== "searchWebForEvent") {
        console.log(`[LangChain] Skipping unknown tool: ${toolCall.name}`);
        continue;
      }

      const toolResult = await searchWebTool.invoke(toolCall.args);
      console.log(`[LangChain Tool] searchWebForEvent returned ${toolResult.length} characters`);

    

      messages.push(new AIMessage(assistantContent));
      messages.push(new ToolMessage({
        name: toolCall.name,
        content: toolResult,
        tool_call_id: toolCall.id,
      }));
    }
  }

  throw new Error("Agent exceeded maximum tool iterations.");
}


export { 
    runAgent
};