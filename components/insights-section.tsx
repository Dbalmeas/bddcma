const insightCards = [
  {
    label: "Taux de fraîcheur moyen",
    value: "12 min",
    detail: "Temps moyen entre la collecte et la mise à disposition analyste.",
  },
  {
    label: "Sources consolidées",
    value: "15 200",
    detail: "Flux vérifiés couvrant réseaux sociaux, presse locale et sources privées.",
  },
  {
    label: "Précision validée",
    value: "97.2%",
    detail: "Contrôle qualité automatique + revue humaine sur les signaux critiques.",
  },
]

const insightList = [
  "Filtrage croisé par pays, typologie et réseau pour éliminer le bruit.",
  "Cartes de chaleur et timelines disponibles directement dans le workspace.",
  "Exports normalisés (CSV, JSON) pour intégrer Everdian à vos outils existants.",
]

export function InsightsSection() {
  return (
    <section id="insights" className="container mx-auto px-4 space-y-8 scroll-mt-32">
      <div className="space-y-3">
        <p className="text-xs tracking-[0.35em] text-primary/80">INSIGHTS</p>
        <div>
          <h2 className="text-3xl md:text-4xl font-semibold text-balance">Des indicateurs pilotables</h2>
          <p className="text-sm md:text-base text-foreground/70 max-w-3xl mt-2">
            Visualisez en un coup d’œil la santé de votre veille et priorisez les zones d’attention.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {insightCards.map((insight) => (
          <article
            key={insight.label}
            className="rounded-3xl border border-white/10 bg-gradient-to-br from-black/70 to-zinc-900/40 p-6"
          >
            <p className="text-xs uppercase text-foreground/60 tracking-wide">{insight.label}</p>
            <p className="text-4xl font-semibold mt-4">{insight.value}</p>
            <p className="text-sm text-foreground/60 mt-3">{insight.detail}</p>
          </article>
        ))}
      </div>

      <div className="rounded-3xl border border-white/10 bg-black/50 p-6 md:p-8">
        <h3 className="text-xl font-semibold mb-4">Pourquoi ces insights comptent</h3>
        <ul className="space-y-3 text-sm text-foreground/70 list-disc pl-5">
          {insightList.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

