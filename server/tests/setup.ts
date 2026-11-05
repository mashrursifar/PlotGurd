if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "public-test-only-secret-not-for-production";
}
