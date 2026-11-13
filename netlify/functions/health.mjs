
export default async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      service: "EduQuiz Pro API"
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    }
  );
};
