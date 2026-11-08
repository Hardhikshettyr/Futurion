const bcrypt = require("bcrypt");
const User = require("../src/models/User");

describe("User password security", () => {
  test("hashes a password and does not rehash it when unchanged", async () => {
    User.collection.insertOne = jest.fn(async (document) => ({
      acknowledged: true,
      insertedId: document._id,
    }));
    User.collection.updateOne = jest.fn(async () => ({
      acknowledged: true,
      matchedCount: 1,
      modifiedCount: 1,
    }));

    const user = new User({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "SecurePassword123!",
    });

    await user.save();
    const firstHash = user.password;

    expect(firstHash).not.toBe("SecurePassword123!");
    expect(await bcrypt.compare("SecurePassword123!", firstHash)).toBe(true);
    expect(user.isEmailVerified).toBe(false);

    user.name = "Ada Byron";
    await user.save();
    expect(user.password).toBe(firstHash);
  });

  test("rejects passwords over bcrypt's 72-byte boundary", async () => {
    const user = new User({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "é".repeat(37),
    });

    await expect(user.validate()).rejects.toThrow("72 UTF-8 bytes");
  });
});
