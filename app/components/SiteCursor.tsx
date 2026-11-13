"use client";
import { useEffect } from "react";
import { installSiteCursor } from "@/lib/site-cursor";
export default function SiteCursor() {
  useEffect(() => { const cursor=installSiteCursor(); return cursor.destroy; }, []);
  return null;
}
