/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    session?: import('./lib/auth/auth.model').SessionRecord;
    adminId?: string;
  }
}

interface Window {
  turnstile?: {
    reset: (id?: string) => void;
    render: (container: string | HTMLElement, options: any) => string;
    getResponse: (id?: string) => string;
  };
}

