import { validateEnvironment } from "./src/lib/env.js";

validateEnvironment();

const [
  { default: app },
  { startScheduler }
] = await Promise.all([
  import("./src/app.js"),
  import("./src/services/scheduler.js")
]);

const PORT =
  Number(
    process.env.PORT ?? 3000
  );

app.listen(
  PORT,
  () => {
    console.log(
      `API listening on http://localhost:${PORT}`
    );

    startScheduler();
  }
);