export type User = {
  id: string;
  name: string;
  email: string;
  balance: number;
};

/** Shared in-memory fixture. Both servers read it; only payments mutates it. */
export const users: User[] = [
  { id: 'b1a7e8c2-1f2d-4e3a-9c4b-1a2b3c4d5e6f', name: 'Bob', email: 'bob@example.com', balance: 1000 },
  { id: 'a2b3c4d5-6e7f-8a9b-0c1d-2e3f4a5b6c7d', name: 'Alice', email: 'alice@example.com', balance: 2000 },
  { id: 'c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f', name: 'Charlie', email: 'charlie@example.com', balance: 500 },
];

export const findByEmail = (email: string): User | undefined =>
  users.find((user) => user.email.toLowerCase() === email.toLowerCase());

export const findById = (id: string): User | undefined => users.find((user) => user.id === id);
