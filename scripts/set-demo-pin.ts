
import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPin(pin: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(pin, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function setDemoPin() {
    console.log("Setting PIN for demo@zimra.com...");

    const [user] = await db.select().from(users).where(eq(users.email, "demo@zimra.com"));

    if (!user) {
        console.error("Demo user not found!");
        process.exit(1);
    }

    const pin = "1234";
    const hashedPin = await hashPin(pin);

    await db.update(users)
        .set({ pin: hashedPin })
        .where(eq(users.id, user.id));

    console.log(`✅ PIN for ${user.email} set to: ${pin}`);
    process.exit(0);
}

setDemoPin();
