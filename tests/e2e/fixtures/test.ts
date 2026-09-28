import { test as base } from "@playwright/test";

import { waitForEmail } from "../../integration/helpers/mailpit";
import { createTestUser, deleteTestUser, type TestUser } from "../../integration/helpers/supabase";

type Fixtures = {
  newUser: TestUser;
  mailpit: { waitForEmail: typeof waitForEmail };
};

export const test = base.extend<Fixtures>({
  newUser: async ({}, use) => {
    const user = await createTestUser();
    try {
      await use(user);
    } finally {
      await deleteTestUser(user.id);
    }
  },
  mailpit: async ({}, use) => {
    await use({ waitForEmail });
  },
});

export { expect } from "@playwright/test";
