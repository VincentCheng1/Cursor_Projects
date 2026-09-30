import { handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import {
  EmailAlreadyRegisteredError,
  registerSchema,
  registerUser,
} from "@/lib/auth/register";

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const user = await registerUser(body);
    return jsonOk({ id: user.id, email: user.email, name: user.name }, 201);
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      return jsonError(error.message, 409);
    }
    return handleRouteError(error);
  }
}
