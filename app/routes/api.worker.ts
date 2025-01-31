import { ActionFunction } from "@remix-run/node";
import { processTask } from "../workers/background.worker";

export const action: ActionFunction = async ({ request }) => {
  try {
    console.log("api.worker.ts action");
    
    const result = await processTask("PROCESS_TASK", {});
    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}; 