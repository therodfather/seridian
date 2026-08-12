import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { Approach } from "@/components/Approach";
import { Expertise } from "@/components/Expertise";
import { Contact } from "@/components/Contact";

export default function Home() {
  return (
    <>
      <Hero />
      <Services />
      <Approach />
      <Expertise />
      <Contact />
    </>
  );
}
