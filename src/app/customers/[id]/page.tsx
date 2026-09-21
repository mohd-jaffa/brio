import React from "react";
import { CustomerProfileClient } from "./CustomerProfileClient";

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerProfileClient id={id} />;
}
