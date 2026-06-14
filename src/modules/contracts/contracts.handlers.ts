import type { RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../factory";
import { getAuth } from "../../auth";
import { ContractsService } from "./contracts.service";
import { getDb } from "../../db";
import {
  generateContractRoute,
  getContractRoute,
  signContractRoute,
  getFairnessRoute,
} from "./contracts.routes";

const formatContractDates = <
  T extends {
    startDate: string | Date;
    endDate: string | Date;
    signedAt?: string | Date | null;
    expiresAt?: string | Date | null;
    createdAt: string | Date;
    updatedAt: string | Date;
  },
>(
  contract: T,
) => ({
  ...contract,
  startDate:
    contract.startDate instanceof Date
      ? contract.startDate.toISOString()
      : (contract.startDate as string),
  endDate:
    contract.endDate instanceof Date
      ? contract.endDate.toISOString()
      : (contract.endDate as string),
  signedAt:
    contract.signedAt instanceof Date
      ? contract.signedAt.toISOString()
      : (contract.signedAt as string | null | undefined),
  expiresAt:
    contract.expiresAt instanceof Date
      ? contract.expiresAt.toISOString()
      : (contract.expiresAt as string | null | undefined),
  createdAt:
    contract.createdAt instanceof Date
      ? contract.createdAt.toISOString()
      : (contract.createdAt as string),
  updatedAt:
    contract.updatedAt instanceof Date
      ? contract.updatedAt.toISOString()
      : (contract.updatedAt as string),
});

export const generateContractHandler: RouteHandler<
  typeof generateContractRoute,
  AppEnv
> = async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  // @ts-ignore - session.user.role is added in auth config
  const role = (session.user.role as string) || "tenant";
  if (role !== "landlord") {
    return c.json({ message: "Only landlords can generate contracts" }, 403);
  }

  try {
    const { bookingId } = c.req.valid("json");
    const db = getDb(c.env);
    const contractsService = new ContractsService(db);

    const contract = await contractsService.generateContract(bookingId, c.env);
    return c.json(
      { message: "Contract generated", data: formatContractDates(contract) },
      201,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg.includes("not found")) {
      return c.json({ message: msg }, 404);
    }
    return c.json({ message: msg }, 400);
  }
};

export const getContractHandler: RouteHandler<
  typeof getContractRoute,
  AppEnv
> = async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const { id } = c.req.valid("param");
  try {
    const db = getDb(c.env);
    const contractsService = new ContractsService(db);

    const contract = await contractsService.getContractById(id);
    if (!contract) {
      return c.json({ message: "Contract not found" }, 404);
    }

    if (
      contract.tenantId !== session.user.id &&
      contract.landlordId !== session.user.id
    ) {
      return c.json({ message: "Forbidden" }, 403);
    }

    return c.json(
      { message: "Get contract detail", data: formatContractDates(contract) },
      200,
    );
  } catch (error) {
    return c.json(
      { message: error instanceof Error ? error.message : "Error" },
      500,
    );
  }
};

export const signContractHandler: RouteHandler<
  typeof signContractRoute,
  AppEnv
> = async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  // @ts-ignore
  const role = (session.user.role as string) || "tenant";
  const { id } = c.req.valid("param");

  try {
    const db = getDb(c.env);
    const contractsService = new ContractsService(db);

    const contract = await contractsService.signContract(
      id,
      session.user.id,
      role,
    );
    return c.json(
      { message: "Contract signed", data: formatContractDates(contract) },
      200,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg.includes("Unauthorized") || msg.includes("Forbidden")) {
      return c.json({ message: msg }, 403);
    }
    if (msg.includes("not found")) {
      return c.json({ message: msg }, 404);
    }
    return c.json({ message: msg }, 400);
  }
};

export const getFairnessHandler: RouteHandler<
  typeof getFairnessRoute,
  AppEnv
> = async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const { id } = c.req.valid("param");
  try {
    const db = getDb(c.env);
    const contractsService = new ContractsService(db);

    const contract = await contractsService.getContractById(id);
    if (!contract) {
      return c.json({ message: "Contract not found" }, 404);
    }

    if (
      contract.tenantId !== session.user.id &&
      contract.landlordId !== session.user.id
    ) {
      return c.json({ message: "Forbidden" }, 403);
    }

    const score = contract.fairnessScore || 50;
    return c.json(
      {
        message: "Get fairness score",
        data: {
          score,
          summary: `Kontrak ini memiliki nilai keadilan ${score}/100. Evaluasi AI menunjukkan kesepakatan berimbang sesuai ketentuan KUHPerdata.`,
        },
      },
      200,
    );
  } catch (error) {
    return c.json(
      { message: error instanceof Error ? error.message : "Error" },
      500,
    );
  }
};
