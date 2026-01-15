import type { Handler } from "@netlify/functions";

export const handler: Handler = async () => {
    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
    };
};
