import { authenticate } from "../auth.$/helpers.mts";
import t from "./+types.route";

export const loader = async ({ request, context: [env] }: t.LoaderArgs) => {
  try {
    // Check if the user is authenticated via cookie
    const user = await authenticate(request, env.SECRET_KEY);
    return { user };
  } catch {
    // If authentication fails or cookie is invalid/expired, return undefined user
    return { user: undefined };
  }
};

// Main component for the authentication route
export default function Route({ loaderData: { user } }: t.ComponentProps) {
  return (
    <div class="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
      <div class="bg-white shadow-md rounded-lg p-8 max-w-md w-full">
        <h1 class="text-2xl font-bold mb-6 text-center text-gray-800">
          Authentication
        </h1>

        {user ? (
          // Authenticated User UI
          <div class="space-y-6">
            <p class="text-center text-green-600">Welcome, {user.userId}!</p>

            {/* Add Email Form */}
            <form method="post" action="/auth/add-email" class="space-y-4">
              <div>
                <label
                  for="email"
                  class="block text-sm font-medium text-gray-700"
                >
                  Add Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add Email
              </button>
            </form>

            {/* Sign Out Form */}
            <form method="post" action="/auth/sign-out">
              <button
                type="submit"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sign Out
              </button>
            </form>
          </div>
        ) : (
          // Unauthenticated User UI
          <div class="space-y-6">
            <p class="text-center text-gray-600">Please sign in or register.</p>

            {/* Register Form */}
            <form method="post" action="/auth/register" class="space-y-4">
              <h2 class="text-lg font-semibold text-gray-700">Register</h2>
              <div>
                <label
                  for="username"
                  class="block text-sm font-medium text-gray-700"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  required
                  class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="your_username"
                />
              </div>
              <button
                type="submit"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Register with Passkey
              </button>
            </form>

            {/* Verify Passkey Form */}
            <form method="post" action="/auth/verify" class="space-y-4">
              <h2 class="text-lg font-semibold text-gray-700">
                Already have a Passkey?
              </h2>
              <button
                type="submit"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Verify Passkey
              </button>
            </form>

            {/* Recover Passkey Form */}
            <form method="post" action="/auth/recover" class="space-y-4">
              <h2 class="text-lg font-semibold text-gray-700">
                Recover Passkey
              </h2>
              <div>
                <label
                  for="recover-username"
                  class="block text-sm font-medium text-gray-700"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="recover-username"
                  name="username"
                  required
                  class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="your_username"
                />
              </div>
              <button
                type="submit"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Recover Passkey
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
