export function notFoundHandler(_request, response) {
  response.status(404).json({ error: "Route introuvable." });
}

export function errorHandler(error, _request, response, _next) {
  console.error("API request failed:", error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  response.status(status).json({
    error: status === 500 ? "Une erreur interne est survenue." : error.message,
  });
}
