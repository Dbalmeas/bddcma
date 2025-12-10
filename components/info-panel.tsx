"use client"

import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Separator } from "./ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion"
import { Badge } from "./ui/badge"
import { Share2, Link2, Download } from "lucide-react"

const stats = [
  { label: "Bookings", value: "~20K" },
  { label: "Clients", value: "~500" },
  { label: "Ports", value: "~150" },
]

const exampleQueries = [
  "Quel est le volume TEU de Renault depuis le début d'année ?",
  "Part Spot vs Long Terme sur la trade Asie-Europe",
  "Top 10 clients par volume dernier trimestre",
  "Clients avec volume en baisse > 20% vs N-1",
  "Nombre de reefers au départ Shanghai en novembre",
  "Répartition des marchandises dangereuses par destination",
]

export function InfoPanel() {
  return (
    <aside className="hidden xl:block w-[300px] border-l border-white/10 bg-black/20 overflow-y-auto">
      <div className="p-6 space-y-6">
        <Card className="p-4 bg-zinc-900/30 border-white/10">
          <h3 className="text-sm font-semibold mb-4">Database Stats</h3>
          <div className="space-y-3">
            {stats.map((stat) => (
              <div key={stat.label} className="flex justify-between items-center">
                <span className="text-xs text-foreground/60">{stat.label}</span>
                <Badge variant="outline" className="border-white/20 font-mono">
                  {stat.value}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <div>
          <h3 className="text-sm font-semibold mb-3">Active Filters</h3>
          <Card className="p-4 bg-zinc-900/30 border-white/10">
            <p className="text-xs text-foreground/50 text-center">No filters applied</p>
          </Card>
        </div>

        <Separator className="bg-white/10" />

        <div>
          <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2 border-white/10 bg-transparent">
              <Download className="h-4 w-4" />
              Export current view
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2 border-white/10 bg-transparent">
              <Share2 className="h-4 w-4" />
              Share session
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2 border-white/10 bg-transparent">
              <Link2 className="h-4 w-4" />
              Generate link
            </Button>
          </div>
        </div>

        <Separator className="bg-white/10" />

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="help" className="border-white/10">
            <AccordionTrigger className="text-sm font-semibold hover:no-underline">Help & Examples</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2">
                <p className="text-xs text-foreground/60 mb-3">Try these example queries:</p>
                {exampleQueries.map((query, i) => (
                  <p key={i} className="text-xs text-foreground/70 font-mono bg-zinc-900/50 p-2 rounded">
                    {query}
                  </p>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </aside>
  )
}
