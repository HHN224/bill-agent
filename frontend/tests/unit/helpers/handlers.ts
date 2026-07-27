import { http, HttpResponse } from "msw";

import { makeTransaction, ORIGIN } from "./fixtures";

/** 默认处理器：各测试可用 server.use() 覆盖。 */
export const handlers = [
  http.get(`${ORIGIN}/api/transactions`, ({ request }) => {
    if (request.headers.get("Authorization") !== "Bearer test-token") {
      return HttpResponse.json(
        {
          success: false,
          error_code: "UNAUTHORIZED",
          message: "Missing or invalid admin token.",
          details: null,
        },
        { status: 401 },
      );
    }
    return HttpResponse.json({ items: [makeTransaction()], total: 1 });
  }),

  http.post(`${ORIGIN}/api/transactions/manual`, () => {
    return HttpResponse.json(makeTransaction({ id: 99 }), { status: 201 });
  }),
];
