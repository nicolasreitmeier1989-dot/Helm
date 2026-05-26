import { Metadata } from "next";
import { WarRoom } from "./WarRoom";
import "./wargame.css";

export const metadata: Metadata = {
  title: "WFC // War Room",
  description: "Three years. Twelve quarters. One worst-feared competitor. Run the simulation.",
};

export default function WarPage() {
  return <WarRoom />;
}
