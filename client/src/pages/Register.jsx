import { useState } from "react";
import {
  Link,
  Navigate,
  useNavigate
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function Register() {
  const { register, isAuthenticated } =
    useAuth();

  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] =
    useState(false);

  if (isAuthenticated) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  async function submit(event) {
    event.preventDefault();

    try {
      setError("");
      setLoading(true);

      await register(
        name,
        email,
        password
      );

      navigate("/dashboard");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold">
          Create Account
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Start managing your finances.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={submit}
          className="mt-6 space-y-4"
        >
          <input
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            required
            placeholder="Name"
            className="w-full rounded-lg border px-3 py-2"
          />

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
            placeholder="Email"
            className="w-full rounded-lg border px-3 py-2"
          />

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
            minLength={8}
            placeholder="Password"
            className="w-full rounded-lg border px-3 py-2"
          />

          <button
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? "Creating..."
              : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-blue-600 hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;