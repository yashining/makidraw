import express from "express";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use(express.static("dist"));

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
