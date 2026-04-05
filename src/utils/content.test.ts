import { z } from 'zod';

// Define Zod schemas for auto and pro collections
const autoSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.date(),
  author: z.string().min(1),
});

const proSchema = z.object({
  projectName: z.string().min(1),
  projectUrl: z.string().url(),
  created: z.date(),
  contributors: z.array(z.string()).min(1),
});

// Test cases for autoSchema
const autoValidInput = {
  title: "Sample Auto Collection",
  description: "A collection for testing.",
  date: new Date(),
  author: "keithdba",
};

const autoInvalidInput = {
  title: "",
  date: "not-a-date",
};

// Validate Auto Collection
try {
  autoSchema.parse(autoValidInput);
  console.log('Auto valid input passed.');
} catch (e) {
  console.error('Auto valid input failed:', e.errors);
}

try {
  autoSchema.parse(autoInvalidInput);
  console.error('Auto invalid input should not have passed.');
} catch (e) {
  console.log('Auto invalid input correctly failed:', e.errors);
}

// Test cases for proSchema
const proValidInput = {
  projectName: "Astro Portfolio",
  projectUrl: "https://github.com/keithdba/astro-portfolio",
  created: new Date(),
  contributors: ["keithdba", "another-contributor"],
};

const proInvalidInput = {
  projectName: " ",
  projectUrl: "not-a-url",
  contributors: [],
};

// Validate Pro Collection
try {
  proSchema.parse(proValidInput);
  console.log('Pro valid input passed.');
} catch (e) {
  console.error('Pro valid input failed:', e.errors);
}

try {
  proSchema.parse(proInvalidInput);
  console.error('Pro invalid input should not have passed.');
} catch (e) {
  console.log('Pro invalid input correctly failed:', e.errors);
}