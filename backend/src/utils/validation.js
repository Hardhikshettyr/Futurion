function formatValidationErrors(issues) {
  return issues.map((issue) => ({
    field:
      issue.code === "unrecognized_keys"
        ? issue.keys.join(", ")
        : issue.path.join(".") || "body",
    message: issue.message,
  }));
}

function validateRequest(schema, requestBody) {
  const result = schema.safeParse(requestBody);

  if (result.success) {
    return { data: result.data, errors: null };
  }

  return {
    data: null,
    errors: formatValidationErrors(result.error.issues),
  };
}

module.exports = { formatValidationErrors, validateRequest };
