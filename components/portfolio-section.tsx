const portfolioProjects = [
  {
    name: "Risk Intelligence Suite",
    stage: "En production",
    description: "Pipeline temps réel reliant ingestion, validation et restitution IA pour les analystes opérationnels.",
    tags: ["Realtime", "Copilot", "LLM Guardrails"],
  },
  {
    name: "Field Watch",
    stage: "Pilote client",
    description: "Vue unifiée des événements géolocalisés pour les équipes terrain avec alertes proactives multi-canaux.",
    tags: ["Mapping", "Alerting", "Supabase"],
  },
  {
    name: "Signal Graph",
    stage: "R&D",
    description: "Graphique de corrélation qui relie acteurs, lieux et typologies pour accélérer les investigations.",
    tags: ["Graph DB", "Analytics", "Node-Edge"],
  },
  {
    name: "Compliance Desk",
    stage: "Prototype",
    description: "Templates prêts à l’emploi pour produire des rapports conformes aux normes internationales.",
    tags: ["Reporting", "Templates", "Automation"],
  },
]

export function PortfolioSection() {
  return (
    <section id="portfolio" className="container mx-auto px-4 space-y-8 scroll-mt-32">
      <div className="space-y-3">
        <p className="text-xs tracking-[0.35em] text-primary/80">PORTFOLIO</p>
        <div>
          <h2 className="text-3xl md:text-4xl font-semibold text-balance">Une plateforme pensée pour l’action</h2>
          <p className="text-sm md:text-base text-foreground/70 max-w-2xl mt-2">
            Chaque module du portfolio répond à un besoin métier précis et reste connecté à la même base de données fiable.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {portfolioProjects.map((project) => (
          <article
            key={project.name}
            className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">{project.name}</h3>
                <p className="text-sm text-foreground/60 mt-2">{project.description}</p>
              </div>
              <span className="text-xs uppercase tracking-wide text-primary">{project.stage}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-3 py-1 rounded-full border border-white/10 bg-white/5 text-foreground/80"
                >
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

