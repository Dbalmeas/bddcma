"use client"

import { Button } from "./ui/button"
import { Badge } from "./ui/badge"

const templates = [
  {
    title: "SitRep quotidiens",
    description: "Résumé automatique par pays avec top incidents, sources et recommandations opérationnelles.",
    category: "Reporting",
    prompt: "Prépare un sitrep journalier pour la région MENA avec les 5 incidents critiques et leurs sources.",
  },
  {
    title: "Analyse de crise",
    description: "Timeline détaillée, acteurs impliqués et impacts business pour les incidents majeurs.",
    category: "Crise",
    prompt: "Construis une timeline synthétique sur les cyberattaques en Europe durant les 48 dernières heures.",
  },
  {
    title: "Veille thématique",
    description: "Filtre un risque précis (cyber, supply chain, ESG) et propose les actions à engager.",
    category: "Veille",
    prompt: "Liste les incidents logistiques affectant le transport ferroviaire en France cette semaine.",
  },
]

export function TemplatesShowcase() {
  const handleUseTemplate = (prompt: string) => {
    window.dispatchEvent(
      new CustomEvent("everdian-template", {
        detail: { prompt },
      })
    )
    const workspace = document.querySelector("#workspace")
    workspace?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <section id="templates" className="container mx-auto px-4 space-y-8 scroll-mt-32">
      <div className="space-y-3">
        <p className="text-xs tracking-[0.35em] text-primary/80">TEMPLATES</p>
        <div>
          <h2 className="text-3xl md:text-4xl font-semibold text-balance">Des prompts prêts pour vos équipes</h2>
          <p className="text-sm md:text-base text-foreground/70 max-w-3xl mt-2">
            Choisissez un template et ouvrez instantanément le workspace avec la requête pré-remplie.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {templates.map((template) => (
          <article
            key={template.title}
            className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6 flex flex-col gap-4"
          >
            <Badge variant="outline" className="w-fit border-white/20 text-xs uppercase tracking-wide">
              {template.category}
            </Badge>
            <div>
              <h3 className="text-xl font-semibold">{template.title}</h3>
              <p className="text-sm text-foreground/60 mt-2">{template.description}</p>
            </div>
            <div className="text-xs text-foreground/50 bg-black/40 border border-white/5 rounded-2xl p-3 leading-relaxed">
              {template.prompt}
            </div>
            <Button
              className="mt-auto bg-white text-black hover:bg-white/90"
              onClick={() => handleUseTemplate(template.prompt)}
            >
              Préparer dans le workspace
            </Button>
          </article>
        ))}
      </div>
    </section>
  )
}

