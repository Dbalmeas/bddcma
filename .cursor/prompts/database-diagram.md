# Diagramme de la Base de Données Supabase

## Architecture globale

```mermaid
graph TB
    CSV[Albert_School_V2_6months2020.csv<br/>1.3M lignes]
    
    subgraph "Base Supabase"
        B[bookings<br/>1,189,237 lignes<br/>547 MB]
        D[dtl_sequences<br/>1,299,620 lignes<br/>411 MB]
        
        B -->|1:N| D
    end
    
    subgraph "Vues Matérialisées"
        MVC[mv_client_monthly_volumes<br/>78,876 lignes]
        MVS[mv_shipper_monthly_volumes<br/>52 lignes]
        MVP[mv_port_volumes]
    end
    
    subgraph "Fonctions SQL"
        GCV[get_client_volume]
        GTC[get_top_clients]
        GSV[get_shipper_volume]
        GTS[get_top_shippers]
    end
    
    CSV --> B
    CSV --> D
    
    B --> MVC
    D --> MVC
    B --> MVS
    D --> MVS
    B --> MVP
    D --> MVP
    
    B --> GCV
    D --> GCV
    B --> GTC
    D --> GTC
    B --> GSV
    D --> GSV
    B --> GTS
    D --> GTS
```

## Structure des tables

```mermaid
erDiagram
    BOOKINGS ||--o{ DTL_SEQUENCES : contains
    
    BOOKINGS {
        text job_reference PK
        text shipcomp_code "Transporteur"
        text shipcomp_name "CMA_CGM,_APL,_ANL"
        text partner_code "Client"
        text partner_name "Décathlon,_etc"
        text origin "FAR_EAST"
        text destination "NORTH_EUROPE"
        text point_load "Port_chargement"
        text point_disch "Port_déchargement"
        date booking_confirmation_date
        integer job_status "9=annulé"
        text contract_type "Monthly,_Spot"
        text commercial_trade
        text voyage_reference
        text service_no
    }
    
    DTL_SEQUENCES {
        text job_reference FK
        integer job_dtl_sequence PK
        text package_code "20ST,_40HC"
        boolean haz_flag "Dangereux"
        boolean reef_flag "Réfrigéré"
        boolean oog_flag "Hors_gabarit"
        numeric teus_booked "Volume_TEU"
        numeric nb_units "Nb_conteneurs"
        numeric net_weight_booked "Poids"
        text commodity_code_lara
        text marketing_commodity_l0
    }
```

## Flux de données

```mermaid
flowchart LR
    subgraph "Import"
        CSV[CSV 1.3M lignes]
        SCRIPT[import-albert-v2.ts]
    end
    
    subgraph "Stockage"
        B[(bookings)]
        D[(dtl_sequences)]
    end
    
    subgraph "Agrégation"
        MV1[Vues matérialisées]
        FUNC[Fonctions SQL]
    end
    
    subgraph "Application"
        API[API Next.js]
        UI[Interface utilisateur]
    end
    
    CSV -->|Parse CSV| SCRIPT
    SCRIPT -->|Insert| B
    SCRIPT -->|Insert| D
    B --> MV1
    D --> MV1
    B --> FUNC
    D --> FUNC
    MV1 --> API
    FUNC --> API
    API --> UI
```

## Hiérarchie Client / Transporteur / Booking

```mermaid
graph TD
    subgraph "Niveau 1: Transporteurs (4)"
        T1[CMA CGM<br/>73% du marché]
        T2[APL<br/>14%]
        T3[ANL<br/>13%]
        T4[CHENG LIE<br/>0.0003%]
    end
    
    subgraph "Niveau 2: Clients (27,401)"
        C1[Décathlon<br/>220 bookings]
        C2[Agacia Ceylon<br/>18,038 bookings]
        C3[Autres<br/>27,399 clients]
    end
    
    subgraph "Niveau 3: Bookings (1.2M)"
        B1[JREF_xxx<br/>booking 1]
        B2[JREF_yyy<br/>booking 2]
        B3[...]
    end
    
    subgraph "Niveau 4: Conteneurs (1.3M)"
        CT1[20ST]
        CT2[40HC]
        CT3[40ST]
    end
    
    T1 --> C1
    T1 --> C2
    C1 --> B1
    C2 --> B2
    B1 --> CT1
    B1 --> CT2
    B2 --> CT3
```

## Distribution géographique

```mermaid
graph LR
    subgraph "Origine"
        O1[FAR EAST]
        O2[NORTH EUROPE]
        O3[MEDITERRANEAN]
        O4[Autres]
    end
    
    subgraph "518 Ports de chargement"
        POL1[CNTAO - Qingdao]
        POL2[CNSHA - Shanghai]
        POL3[CNNGB - Ningbo]
        POL4[...]
    end
    
    subgraph "609 Ports déchargement"
        POD1[GBFXT - Felixstowe]
        POD2[DEHAM - Hamburg]
        POD3[NLRTM - Rotterdam]
        POD4[...]
    end
    
    subgraph "Destination"
        D1[NORTH EUROPE]
        D2[FAR EAST]
        D3[MEDITERRANEAN]
        D4[Autres]
    end
    
    O1 --> POL1
    O1 --> POL2
    POL1 --> POD1
    POL2 --> POD2
    POD1 --> D1
    POD2 --> D1
```

## Timeline des données

```mermaid
gantt
    title Période des données dans Supabase
    dateFormat  YYYY-MM-DD
    
    section Import
    Import CSV (1.3M lignes)    :done, 2025-12-09, 1d
    
    section Données
    Données historiques         :active, 2017-01-05, 2021-03-18
    CMA CGM (871K bookings)    :2017-01-05, 2021-03-18
    APL (164K bookings)        :2018-12-06, 2020-08-21
    ANL (154K bookings)        :2019-06-04, 2020-12-09
    
    section Gap
    Données manquantes         :crit, 2021-03-19, 2025-12-09
```

## Index de performance

```mermaid
graph TD
    subgraph "Bookings Indexes"
        I1[idx_bookings_client_date<br/>Client + Date]
        I2[idx_bookings_partner_date<br/>Partner + Date]
        I3[idx_bookings_contract_trade<br/>Contract + Trade]
        I4[idx_bookings_disch_country<br/>Country + Port]
    end
    
    subgraph "DTL_Sequences Indexes"
        I5[idx_dtl_sequences_flags<br/>Reefer, HAZ, OOG]
        I6[idx_dtl_sequences_composite<br/>Reference + TEU + Units]
        I7[idx_dtl_commodity<br/>Commodity Code]
    end
    
    subgraph "Performance"
        P1[< 50ms<br/>Requêtes simples]
        P2[< 200ms<br/>Agrégations complexes]
    end
    
    I1 --> P1
    I2 --> P1
    I5 --> P1
    I6 --> P2
```

## Flux d'analyse typique

```mermaid
sequenceDiagram
    participant User
    participant API
    participant Supabase
    participant Views as Vues Matérialisées
    participant Functions as Fonctions SQL
    
    User->>API: "Top 10 clients en 2020"
    API->>Functions: get_top_clients(10, '2020-01-01', '2020-12-31')
    Functions->>Supabase: SELECT avec JOIN + aggregation
    Supabase-->>Functions: Résultat agrégé
    Functions-->>API: JSON résultat
    API-->>User: {rank, client, TEU, %}
    
    User->>API: "Volume mensuel Décathlon"
    API->>Views: SELECT FROM mv_client_monthly_volumes
    Views-->>API: Données pré-calculées (ultra rapide)
    API-->>User: [{month, TEU, bookings}]
```

## Types de conteneurs

```mermaid
pie title Distribution des types de conteneurs
    "20ST (20 pieds)" : 45
    "40HC (40 high cube)" : 35
    "40ST (40 pieds)" : 15
    "45HC (45 high cube)" : 3
    "Autres" : 2
```

## Flags spéciaux

```mermaid
pie title Répartition des flags spéciaux
    "Standard (aucun flag)" : 85
    "Reefer (réfrigéré)" : 8
    "HAZ (dangereux)" : 4
    "OOG (hors gabarit)" : 2
    "SOC (client-owned)" : 1
```

---

## Légende

- **PK** : Primary Key (clé primaire)
- **FK** : Foreign Key (clé étrangère)
- **TEU** : Twenty-foot Equivalent Unit (unité de mesure conteneur)
- **POL** : Port of Loading (port de chargement)
- **POD** : Port of Discharge (port de déchargement)
- **HAZ** : Hazardous (marchandise dangereuse)
- **OOG** : Out of Gauge (hors gabarit)
- **SOC** : Shipper Owned Container (conteneur du client)

---

**Note** : Les diagrammes Mermaid s'affichent automatiquement dans les éditeurs compatibles (GitHub, Cursor, VSCode avec extensions).
