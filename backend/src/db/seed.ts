import 'dotenv/config'
import { getDriver, closeDriver } from './neo4j'

const seed = async () => {
    const driver = getDriver()
    const session = driver.session()

    try {
        console.log('🌱 Mazání starých dat...')
        await session.run('MATCH (n) DETACH DELETE n')

        // ─────────────────────────────────────────
        // UŽIVATEL
        // ─────────────────────────────────────────
        console.log('👤 Vytváření uživatele...')
        await session.run(`
      CREATE (u:User {
        id: 'user-001',
        name: 'Jan Novák',
        email: 'jan.novak@email.cz',
        createdAt: '2022-01-01',
        currency: 'CZK'
      })
    `)

        // ─────────────────────────────────────────
        // ÚČTY
        // ─────────────────────────────────────────
        console.log('🏦 Vytváření účtů...')
        await session.run(`
      MATCH (u:User {id: 'user-001'})
      CREATE (a1:Account {
        id: 'acc-001',
        name: 'Běžný účet',
        type: 'checking',
        balance: 87400,
        bank: 'Komerční banka',
        createdAt: '2022-01-01'
      })
      CREATE (a2:Account {
        id: 'acc-002',
        name: 'Spořicí účet',
        type: 'savings',
        balance: 245000,
        bank: 'Komerční banka',
        createdAt: '2022-01-01'
      })
      CREATE (a3:Account {
        id: 'acc-003',
        name: 'Revolut',
        type: 'checking',
        balance: 12300,
        bank: 'Revolut',
        createdAt: '2023-03-15'
      })
      CREATE (u)-[:HAS {primaryAccount: true}]->(a1)
      CREATE (u)-[:HAS {primaryAccount: false}]->(a2)
      CREATE (u)-[:HAS {primaryAccount: false}]->(a3)
    `)

        // ─────────────────────────────────────────
        // KARTY
        // ─────────────────────────────────────────
        console.log('💳 Vytváření karet...')
        await session.run(`
      MATCH (u:User {id: 'user-001'})
      MATCH (a1:Account {id: 'acc-001'})
      MATCH (a3:Account {id: 'acc-003'})
      CREATE (c1:Card {
        id: 'card-001',
        name: 'KB Visa Debit',
        type: 'debit',
        lastDigits: '4821',
        limit: null,
        linkedAccount: 'acc-001'
      })
      CREATE (c2:Card {
        id: 'card-002',
        name: 'KB Visa Credit',
        type: 'credit',
        lastDigits: '9034',
        limit: 50000,
        linkedAccount: 'acc-001'
      })
      CREATE (c3:Card {
        id: 'card-003',
        name: 'Revolut Virtual',
        type: 'debit',
        lastDigits: '1156',
        limit: null,
        linkedAccount: 'acc-003'
      })
      CREATE (u)-[:OWNS]->(c1)
      CREATE (u)-[:OWNS]->(c2)
      CREATE (u)-[:OWNS]->(c3)
      CREATE (a1)-[:LINKED_TO]->(c1)
      CREATE (a1)-[:LINKED_TO]->(c2)
      CREATE (a3)-[:LINKED_TO]->(c3)
    `)

        // ─────────────────────────────────────────
        // KATEGORIE (hierarchie)
        // ─────────────────────────────────────────
        console.log('📂 Vytváření kategorií...')
        await session.run(`
      MATCH (u:User {id: 'user-001'})

      CREATE (cBydleni:Category    { id: 'cat-bydleni',    name: 'Bydlení',       type: 'expense', color: '#ef4444', budget: 16000 })
      CREATE (cJidlo:Category      { id: 'cat-jidlo',      name: 'Jídlo',         type: 'expense', color: '#f97316', budget: 10000 })
      CREATE (cTransport:Category  { id: 'cat-transport',  name: 'Transport',     type: 'expense', color: '#eab308', budget: 4000  })
      CREATE (cZabava:Category     { id: 'cat-zabava',     name: 'Zábava',        type: 'expense', color: '#8b5cf6', budget: 5000  })
      CREATE (cZdravı:Category     { id: 'cat-zdravi',     name: 'Zdraví',        type: 'expense', color: '#06b6d4', budget: 2000  })
      CREATE (cObleceni:Category   { id: 'cat-obleceni',   name: 'Oblečení',      type: 'expense', color: '#ec4899', budget: 3000  })
      CREATE (cPrijmy:Category     { id: 'cat-prijmy',     name: 'Příjmy',        type: 'income',  color: '#22c55e', budget: null  })
      CREATE (cSporeni:Category    { id: 'cat-sporeni',    name: 'Spoření',       type: 'expense', color: '#3b82f6', budget: null  })

      // Podkategorie Jídla
      CREATE (cRestaurace:Category { id: 'cat-restaurace', name: 'Restaurace',    type: 'expense', color: '#fb923c', budget: 4000  })
      CREATE (cKavarny:Category    { id: 'cat-kavarny',    name: 'Kavárny',       type: 'expense', color: '#a78bfa', budget: 1500  })
      CREATE (cPotraviny:Category  { id: 'cat-potraviny',  name: 'Potraviny',     type: 'expense', color: '#fdba74', budget: 5000  })

      // Podkategorie Zábavy
      CREATE (cStreaming:Category  { id: 'cat-streaming',  name: 'Streaming',     type: 'expense', color: '#c084fc', budget: 700   })
      CREATE (cKino:Category       { id: 'cat-kino',       name: 'Kino & Kultura',type: 'expense', color: '#818cf8', budget: 1000  })
      CREATE (cSport:Category      { id: 'cat-sport',      name: 'Sport',         type: 'expense', color: '#34d399', budget: 1500  })

      // Podkategorie Transportu
      CREATE (cMhd:Category        { id: 'cat-mhd',        name: 'MHD',           type: 'expense', color: '#fbbf24', budget: 700   })
      CREATE (cAuto:Category       { id: 'cat-auto',       name: 'Auto',          type: 'expense', color: '#f59e0b', budget: 2000  })
      CREATE (cUber:Category       { id: 'cat-uber',       name: 'Taxi / Uber',   type: 'expense', color: '#d97706', budget: 500   })

      // Hierarchie
      CREATE (cJidlo)-[:PARENT_OF]->(cRestaurace)
      CREATE (cJidlo)-[:PARENT_OF]->(cKavarny)
      CREATE (cJidlo)-[:PARENT_OF]->(cPotraviny)
      CREATE (cZabava)-[:PARENT_OF]->(cStreaming)
      CREATE (cZabava)-[:PARENT_OF]->(cKino)
      CREATE (cZabava)-[:PARENT_OF]->(cSport)
      CREATE (cTransport)-[:PARENT_OF]->(cMhd)
      CREATE (cTransport)-[:PARENT_OF]->(cAuto)
      CREATE (cTransport)-[:PARENT_OF]->(cUber)

      // Propojení s uživatelem
      CREATE (u)-[:HAS]->(cBydleni)
      CREATE (u)-[:HAS]->(cJidlo)
      CREATE (u)-[:HAS]->(cTransport)
      CREATE (u)-[:HAS]->(cZabava)
      CREATE (u)-[:HAS]->(cZdravı)
      CREATE (u)-[:HAS]->(cObleceni)
      CREATE (u)-[:HAS]->(cPrijmy)
      CREATE (u)-[:HAS]->(cSporeni)
    `)

        // ─────────────────────────────────────────
        // OBCHODNÍCI
        // ─────────────────────────────────────────
        console.log('🏪 Vytváření obchodníků...')
        await session.run(`
      MATCH (cPotraviny:Category  {id: 'cat-potraviny'})
      MATCH (cRestaurace:Category {id: 'cat-restaurace'})
      MATCH (cKavarny:Category    {id: 'cat-kavarny'})
      MATCH (cStreaming:Category  {id: 'cat-streaming'})
      MATCH (cMhd:Category        {id: 'cat-mhd'})
      MATCH (cAuto:Category       {id: 'cat-auto'})
      MATCH (cBydleni:Category    {id: 'cat-bydleni'})
      MATCH (cSport:Category      {id: 'cat-sport'})

      CREATE (mAlbert:Merchant    { id: 'm-albert',   name: 'Albert',          category: 'grocery',    location: 'Praha', avgTransactionSize: 650  })
      CREATE (mBilla:Merchant     { id: 'm-billa',    name: 'Billa',           category: 'grocery',    location: 'Praha', avgTransactionSize: 480  })
      CREATE (mSushibar:Merchant  { id: 'm-sushibar', name: 'Sushi Bar Anděl', category: 'restaurant', location: 'Praha', avgTransactionSize: 520  })
      CREATE (mPizza:Merchant     { id: 'm-pizza',    name: 'Pizza Nuova',     category: 'restaurant', location: 'Praha', avgTransactionSize: 280  })
      CREATE (mCafe:Merchant      { id: 'm-cafe',     name: 'Kavárna Místo',   category: 'cafe',       location: 'Praha', avgTransactionSize: 120  })
      CREATE (mStarbucks:Merchant { id: 'm-sbucks',   name: 'Starbucks',       category: 'cafe',       location: 'Praha', avgTransactionSize: 145  })
      CREATE (mNetflix:Merchant   { id: 'm-netflix',  name: 'Netflix',         category: 'streaming',  location: 'online', avgTransactionSize: 199 })
      CREATE (mSpotify:Merchant   { id: 'm-spotify',  name: 'Spotify',         category: 'streaming',  location: 'online', avgTransactionSize: 159 })
      CREATE (mDisney:Merchant    { id: 'm-disney',   name: 'Disney+',         category: 'streaming',  location: 'online', avgTransactionSize: 199 })
      CREATE (mPid:Merchant       { id: 'm-pid',      name: 'PID Lítačka',     category: 'transport',  location: 'Praha', avgTransactionSize: 670  })
      CREATE (mShell:Merchant     { id: 'm-shell',    name: 'Shell',           category: 'fuel',       location: 'Praha', avgTransactionSize: 1200 })
      CREATE (mNajemne:Merchant   { id: 'm-najemne',  name: 'Nájem',           category: 'rent',       location: 'Praha', avgTransactionSize: 14500})
      CREATE (mHolmes:Merchant    { id: 'm-holmes',   name: 'Holmes Place',    category: 'sport',      location: 'Praha', avgTransactionSize: 990  })

      CREATE (mAlbert)-[:IN_CATEGORY]->(cPotraviny)
      CREATE (mBilla)-[:IN_CATEGORY]->(cPotraviny)
      CREATE (mSushibar)-[:IN_CATEGORY]->(cRestaurace)
      CREATE (mPizza)-[:IN_CATEGORY]->(cRestaurace)
      CREATE (mCafe)-[:IN_CATEGORY]->(cKavarny)
      CREATE (mStarbucks)-[:IN_CATEGORY]->(cKavarny)
      CREATE (mNetflix)-[:IN_CATEGORY]->(cStreaming)
      CREATE (mSpotify)-[:IN_CATEGORY]->(cStreaming)
      CREATE (mDisney)-[:IN_CATEGORY]->(cStreaming)
      CREATE (mPid)-[:IN_CATEGORY]->(cMhd)
      CREATE (mShell)-[:IN_CATEGORY]->(cAuto)
      CREATE (mNajemne)-[:IN_CATEGORY]->(cBydleni)
      CREATE (mHolmes)-[:IN_CATEGORY]->(cSport)
    `)

        // ─────────────────────────────────────────
        // TRANSAKCE – Prosinec 2024
        // ─────────────────────────────────────────
        console.log('💸 Vytváření transakcí (prosinec 2024)...')
        await session.run(`
      MATCH (acc1:Account {id: 'acc-001'})
      MATCH (acc2:Account {id: 'acc-002'})
      MATCH (mAlbert:Merchant  {id: 'm-albert'})
      MATCH (mBilla:Merchant   {id: 'm-billa'})
      MATCH (mSushibar:Merchant{id: 'm-sushibar'})
      MATCH (mPizza:Merchant   {id: 'm-pizza'})
      MATCH (mCafe:Merchant    {id: 'm-cafe'})
      MATCH (mStarbucks:Merchant{id: 'm-sbucks'})
      MATCH (mNetflix:Merchant {id: 'm-netflix'})
      MATCH (mSpotify:Merchant {id: 'm-spotify'})
      MATCH (mDisney:Merchant  {id: 'm-disney'})
      MATCH (mPid:Merchant     {id: 'm-pid'})
      MATCH (mShell:Merchant   {id: 'm-shell'})
      MATCH (mNajemne:Merchant {id: 'm-najemne'})
      MATCH (mHolmes:Merchant  {id: 'm-holmes'})
      MATCH (catBydleni:Category   {id: 'cat-bydleni'})
      MATCH (catPotraviny:Category {id: 'cat-potraviny'})
      MATCH (catRestaurace:Category{id: 'cat-restaurace'})
      MATCH (catKavarny:Category   {id: 'cat-kavarny'})
      MATCH (catStreaming:Category {id: 'cat-streaming'})
      MATCH (catMhd:Category       {id: 'cat-mhd'})
      MATCH (catAuto:Category      {id: 'cat-auto'})
      MATCH (catPrijmy:Category    {id: 'cat-prijmy'})
      MATCH (catSporeni:Category   {id: 'cat-sporeni'})
      MATCH (catSport:Category     {id: 'cat-sport'})

      // Příjem – plat
      CREATE (t01:Transaction { id: 'tx-dec-001', date: '2024-12-01', amount: 62000, description: 'Výplata prosinec', type: 'income',   status: 'completed' })
      CREATE (t01)-[:FROM]->(acc1)
      CREATE (t01)-[:CATEGORIZED_AS {confidence: 1.0}]->(catPrijmy)

      // Nájem
      CREATE (t02:Transaction { id: 'tx-dec-002', date: '2024-12-02', amount: 14500, description: 'Nájem prosinec', type: 'expense', status: 'completed' })
      CREATE (t02)-[:FROM]->(acc1)
      CREATE (t02)-[:SPENT_AT {timestamp: '2024-12-02T10:00:00'}]->(mNajemne)
      CREATE (t02)-[:CATEGORIZED_AS {confidence: 1.0}]->(catBydleni)

      // Potraviny
      CREATE (t03:Transaction { id: 'tx-dec-003', date: '2024-12-03', amount: 842, description: 'Albert nákup', type: 'expense', status: 'completed' })
      CREATE (t03)-[:FROM]->(acc1)
      CREATE (t03)-[:SPENT_AT {timestamp: '2024-12-03T18:30:00'}]->(mAlbert)
      CREATE (t03)-[:CATEGORIZED_AS {confidence: 0.98}]->(catPotraviny)

      CREATE (t04:Transaction { id: 'tx-dec-004', date: '2024-12-07', amount: 563, description: 'Billa víkend', type: 'expense', status: 'completed' })
      CREATE (t04)-[:FROM]->(acc1)
      CREATE (t04)-[:SPENT_AT {timestamp: '2024-12-07T11:15:00'}]->(mBilla)
      CREATE (t04)-[:CATEGORIZED_AS {confidence: 0.97}]->(catPotraviny)

      CREATE (t05:Transaction { id: 'tx-dec-005', date: '2024-12-14', amount: 721, description: 'Albert nákup', type: 'expense', status: 'completed' })
      CREATE (t05)-[:FROM]->(acc1)
      CREATE (t05)-[:SPENT_AT {timestamp: '2024-12-14T17:45:00'}]->(mAlbert)
      CREATE (t05)-[:CATEGORIZED_AS {confidence: 0.98}]->(catPotraviny)

      CREATE (t06:Transaction { id: 'tx-dec-006', date: '2024-12-21', amount: 934, description: 'Albert Vánoce', type: 'expense', status: 'completed' })
      CREATE (t06)-[:FROM]->(acc1)
      CREATE (t06)-[:SPENT_AT {timestamp: '2024-12-21T16:00:00'}]->(mAlbert)
      CREATE (t06)-[:CATEGORIZED_AS {confidence: 0.98}]->(catPotraviny)

      // Restaurace
      CREATE (t07:Transaction { id: 'tx-dec-007', date: '2024-12-06', amount: 486, description: 'Sushi Bar Anděl oběd', type: 'expense', status: 'completed' })
      CREATE (t07)-[:FROM]->(acc1)
      CREATE (t07)-[:SPENT_AT {timestamp: '2024-12-06T12:30:00'}]->(mSushibar)
      CREATE (t07)-[:CATEGORIZED_AS {confidence: 0.95}]->(catRestaurace)

      CREATE (t08:Transaction { id: 'tx-dec-008', date: '2024-12-13', amount: 312, description: 'Pizza Nuova večeře', type: 'expense', status: 'completed' })
      CREATE (t08)-[:FROM]->(acc1)
      CREATE (t08)-[:SPENT_AT {timestamp: '2024-12-13T19:00:00'}]->(mPizza)
      CREATE (t08)-[:CATEGORIZED_AS {confidence: 0.93}]->(catRestaurace)

      CREATE (t09:Transaction { id: 'tx-dec-009', date: '2024-12-20', amount: 890, description: 'Vánoční oběd Sushi', type: 'expense', status: 'completed' })
      CREATE (t09)-[:FROM]->(acc1)
      CREATE (t09)-[:SPENT_AT {timestamp: '2024-12-20T13:00:00'}]->(mSushibar)
      CREATE (t09)-[:CATEGORIZED_AS {confidence: 0.95}]->(catRestaurace)

      // Kavárny
      CREATE (t10:Transaction { id: 'tx-dec-010', date: '2024-12-04', amount: 125, description: 'Kavárna Místo', type: 'expense', status: 'completed' })
      CREATE (t10)-[:FROM]->(acc1)
      CREATE (t10)-[:SPENT_AT {timestamp: '2024-12-04T09:00:00'}]->(mCafe)
      CREATE (t10)-[:CATEGORIZED_AS {confidence: 0.99}]->(catKavarny)

      CREATE (t11:Transaction { id: 'tx-dec-011', date: '2024-12-10', amount: 155, description: 'Starbucks', type: 'expense', status: 'completed' })
      CREATE (t11)-[:FROM]->(acc1)
      CREATE (t11)-[:SPENT_AT {timestamp: '2024-12-10T08:45:00'}]->(mStarbucks)
      CREATE (t11)-[:CATEGORIZED_AS {confidence: 0.99}]->(catKavarny)

      CREATE (t12:Transaction { id: 'tx-dec-012', date: '2024-12-17', amount: 125, description: 'Kavárna Místo', type: 'expense', status: 'completed' })
      CREATE (t12)-[:FROM]->(acc1)
      CREATE (t12)-[:SPENT_AT {timestamp: '2024-12-17T09:15:00'}]->(mCafe)
      CREATE (t12)-[:CATEGORIZED_AS {confidence: 0.99}]->(catKavarny)

      // Streaming
      CREATE (t13:Transaction { id: 'tx-dec-013', date: '2024-12-05', amount: 199, description: 'Netflix předplatné', type: 'expense', status: 'completed' })
      CREATE (t13)-[:FROM]->(acc1)
      CREATE (t13)-[:SPENT_AT {timestamp: '2024-12-05T00:00:00'}]->(mNetflix)
      CREATE (t13)-[:CATEGORIZED_AS {confidence: 1.0}]->(catStreaming)

      CREATE (t14:Transaction { id: 'tx-dec-014', date: '2024-12-05', amount: 159, description: 'Spotify předplatné', type: 'expense', status: 'completed' })
      CREATE (t14)-[:FROM]->(acc1)
      CREATE (t14)-[:SPENT_AT {timestamp: '2024-12-05T00:00:00'}]->(mSpotify)
      CREATE (t14)-[:CATEGORIZED_AS {confidence: 1.0}]->(catStreaming)

      CREATE (t15:Transaction { id: 'tx-dec-015', date: '2024-12-05', amount: 199, description: 'Disney+ předplatné', type: 'expense', status: 'completed' })
      CREATE (t15)-[:FROM]->(acc1)
      CREATE (t15)-[:SPENT_AT {timestamp: '2024-12-05T00:00:00'}]->(mDisney)
      CREATE (t15)-[:CATEGORIZED_AS {confidence: 1.0}]->(catStreaming)

      // Transport
      CREATE (t16:Transaction { id: 'tx-dec-016', date: '2024-12-01', amount: 670, description: 'PID roční kupon', type: 'expense', status: 'completed' })
      CREATE (t16)-[:FROM]->(acc1)
      CREATE (t16)-[:SPENT_AT {timestamp: '2024-12-01T08:00:00'}]->(mPid)
      CREATE (t16)-[:CATEGORIZED_AS {confidence: 1.0}]->(catMhd)

      CREATE (t17:Transaction { id: 'tx-dec-017', date: '2024-12-09', amount: 1340, description: 'Shell benzín', type: 'expense', status: 'completed' })
      CREATE (t17)-[:FROM]->(acc1)
      CREATE (t17)-[:SPENT_AT {timestamp: '2024-12-09T17:30:00'}]->(mShell)
      CREATE (t17)-[:CATEGORIZED_AS {confidence: 0.97}]->(catAuto)

      // Sport
      CREATE (t18:Transaction { id: 'tx-dec-018', date: '2024-12-01', amount: 990, description: 'Holmes Place členství', type: 'expense', status: 'completed' })
      CREATE (t18)-[:FROM]->(acc1)
      CREATE (t18)-[:SPENT_AT {timestamp: '2024-12-01T00:00:00'}]->(mHolmes)
      CREATE (t18)-[:CATEGORIZED_AS {confidence: 1.0}]->(catSport)

      // Převod na spoření
      CREATE (t19:Transaction { id: 'tx-dec-019', date: '2024-12-03', amount: 15000, description: 'Převod na spoření', type: 'transfer', status: 'completed' })
      CREATE (t19)-[:FROM]->(acc1)
      CREATE (t19)-[:TO]->(acc2)
      CREATE (t19)-[:CATEGORIZED_AS {confidence: 1.0}]->(catSporeni)

      // Freelance příjem
      CREATE (t20:Transaction { id: 'tx-dec-020', date: '2024-12-15', amount: 12000, description: 'Freelance faktura #2024-12', type: 'income', status: 'completed' })
      CREATE (t20)-[:FROM]->(acc1)
      CREATE (t20)-[:CATEGORIZED_AS {confidence: 0.95}]->(catPrijmy)
    `)

        // ─────────────────────────────────────────
        // TRANSAKCE – Listopad 2024
        // ─────────────────────────────────────────
        console.log('💸 Vytváření transakcí (listopad 2024)...')
        await session.run(`
      MATCH (acc1:Account {id: 'acc-001'})
      MATCH (acc2:Account {id: 'acc-002'})
      MATCH (mAlbert:Merchant  {id: 'm-albert'})
      MATCH (mBilla:Merchant   {id: 'm-billa'})
      MATCH (mSushibar:Merchant{id: 'm-sushibar'})
      MATCH (mCafe:Merchant    {id: 'm-cafe'})
      MATCH (mNetflix:Merchant {id: 'm-netflix'})
      MATCH (mSpotify:Merchant {id: 'm-spotify'})
      MATCH (mDisney:Merchant  {id: 'm-disney'})
      MATCH (mShell:Merchant   {id: 'm-shell'})
      MATCH (mNajemne:Merchant {id: 'm-najemne'})
      MATCH (mHolmes:Merchant  {id: 'm-holmes'})
      MATCH (catBydleni:Category   {id: 'cat-bydleni'})
      MATCH (catPotraviny:Category {id: 'cat-potraviny'})
      MATCH (catRestaurace:Category{id: 'cat-restaurace'})
      MATCH (catKavarny:Category   {id: 'cat-kavarny'})
      MATCH (catStreaming:Category {id: 'cat-streaming'})
      MATCH (catAuto:Category      {id: 'cat-auto'})
      MATCH (catPrijmy:Category    {id: 'cat-prijmy'})
      MATCH (catSporeni:Category   {id: 'cat-sporeni'})
      MATCH (catSport:Category     {id: 'cat-sport'})

      CREATE (t21:Transaction { id: 'tx-nov-001', date: '2024-11-01', amount: 62000, description: 'Výplata listopad', type: 'income',   status: 'completed' })
      CREATE (t21)-[:FROM]->(acc1)
      CREATE (t21)-[:CATEGORIZED_AS {confidence: 1.0}]->(catPrijmy)

      CREATE (t22:Transaction { id: 'tx-nov-002', date: '2024-11-02', amount: 14500, description: 'Nájem listopad', type: 'expense', status: 'completed' })
      CREATE (t22)-[:FROM]->(acc1)
      CREATE (t22)-[:SPENT_AT {timestamp: '2024-11-02T10:00:00'}]->(mNajemne)
      CREATE (t22)-[:CATEGORIZED_AS {confidence: 1.0}]->(catBydleni)

      CREATE (t23:Transaction { id: 'tx-nov-003', date: '2024-11-05', amount: 780, description: 'Albert nákup', type: 'expense', status: 'completed' })
      CREATE (t23)-[:FROM]->(acc1)
      CREATE (t23)-[:SPENT_AT {timestamp: '2024-11-05T18:00:00'}]->(mAlbert)
      CREATE (t23)-[:CATEGORIZED_AS {confidence: 0.98}]->(catPotraviny)

      CREATE (t24:Transaction { id: 'tx-nov-004', date: '2024-11-12', amount: 610, description: 'Billa nákup', type: 'expense', status: 'completed' })
      CREATE (t24)-[:FROM]->(acc1)
      CREATE (t24)-[:SPENT_AT {timestamp: '2024-11-12T11:00:00'}]->(mBilla)
      CREATE (t24)-[:CATEGORIZED_AS {confidence: 0.97}]->(catPotraviny)

      CREATE (t25:Transaction { id: 'tx-nov-005', date: '2024-11-08', amount: 445, description: 'Sushi oběd', type: 'expense', status: 'completed' })
      CREATE (t25)-[:FROM]->(acc1)
      CREATE (t25)-[:SPENT_AT {timestamp: '2024-11-08T12:00:00'}]->(mSushibar)
      CREATE (t25)-[:CATEGORIZED_AS {confidence: 0.95}]->(catRestaurace)

      CREATE (t26:Transaction { id: 'tx-nov-006', date: '2024-11-04', amount: 115, description: 'Kavárna pondělí', type: 'expense', status: 'completed' })
      CREATE (t26)-[:FROM]->(acc1)
      CREATE (t26)-[:SPENT_AT {timestamp: '2024-11-04T09:00:00'}]->(mCafe)
      CREATE (t26)-[:CATEGORIZED_AS {confidence: 0.99}]->(catKavarny)

      CREATE (t27:Transaction { id: 'tx-nov-007', date: '2024-11-05', amount: 199, description: 'Netflix', type: 'expense', status: 'completed' })
      CREATE (t27)-[:FROM]->(acc1)
      CREATE (t27)-[:SPENT_AT {timestamp: '2024-11-05T00:00:00'}]->(mNetflix)
      CREATE (t27)-[:CATEGORIZED_AS {confidence: 1.0}]->(catStreaming)

      CREATE (t28:Transaction { id: 'tx-nov-008', date: '2024-11-05', amount: 159, description: 'Spotify', type: 'expense', status: 'completed' })
      CREATE (t28)-[:FROM]->(acc1)
      CREATE (t28)-[:SPENT_AT {timestamp: '2024-11-05T00:00:00'}]->(mSpotify)
      CREATE (t28)-[:CATEGORIZED_AS {confidence: 1.0}]->(catStreaming)

      CREATE (t29:Transaction { id: 'tx-nov-009', date: '2024-11-05', amount: 199, description: 'Disney+', type: 'expense', status: 'completed' })
      CREATE (t29)-[:FROM]->(acc1)
      CREATE (t29)-[:SPENT_AT {timestamp: '2024-11-05T00:00:00'}]->(mDisney)
      CREATE (t29)-[:CATEGORIZED_AS {confidence: 1.0}]->(catStreaming)

      CREATE (t30:Transaction { id: 'tx-nov-010', date: '2024-11-18', amount: 1150, description: 'Shell benzín', type: 'expense', status: 'completed' })
      CREATE (t30)-[:FROM]->(acc1)
      CREATE (t30)-[:SPENT_AT {timestamp: '2024-11-18T16:30:00'}]->(mShell)
      CREATE (t30)-[:CATEGORIZED_AS {confidence: 0.97}]->(catAuto)

      CREATE (t31:Transaction { id: 'tx-nov-011', date: '2024-11-01', amount: 990, description: 'Holmes Place', type: 'expense', status: 'completed' })
      CREATE (t31)-[:FROM]->(acc1)
      CREATE (t31)-[:SPENT_AT {timestamp: '2024-11-01T00:00:00'}]->(mHolmes)
      CREATE (t31)-[:CATEGORIZED_AS {confidence: 1.0}]->(catSport)

      CREATE (t32:Transaction { id: 'tx-nov-012', date: '2024-11-03', amount: 15000, description: 'Převod na spoření', type: 'transfer', status: 'completed' })
      CREATE (t32)-[:FROM]->(acc1)
      CREATE (t32)-[:TO]->(acc2)
      CREATE (t32)-[:CATEGORIZED_AS {confidence: 1.0}]->(catSporeni)
    `)

        // ─────────────────────────────────────────
        // ANOMÁLNÍ TRANSAKCE (pro detekci)
        // ─────────────────────────────────────────
        console.log('🚨 Vytváření anomálních transakcí...')
        await session.run(`
      MATCH (acc1:Account {id: 'acc-001'})
      MATCH (catBydleni:Category {id: 'cat-bydleni'})

      CREATE (tAnomaly:Transaction {
        id: 'tx-anomaly-001',
        date: '2024-12-14',
        amount: 48000,
        description: 'Neznámý obchodník',
        type: 'expense',
        status: 'completed',
        metadata: 'location:Kazakhstan,time:03:15'
      })
      CREATE (tAnomaly)-[:FROM]->(acc1)
      CREATE (tAnomaly)-[:CATEGORIZED_AS {confidence: 0.4}]->(catBydleni)
    `)

        // ─────────────────────────────────────────
        // CÍLE
        // ─────────────────────────────────────────
        console.log('🎯 Vytváření cílů...')
        await session.run(`
      MATCH (u:User {id: 'user-001'})
      MATCH (acc2:Account {id: 'acc-002'})
      MATCH (t19:Transaction {id: 'tx-dec-019'})
      MATCH (t32:Transaction {id: 'tx-nov-012'})

      CREATE (g1:Goal {
        id: 'goal-001',
        name: 'Dovolená Japonsko',
        type: 'savings',
        targetAmount: 80000,
        currentAmount: 32000,
        deadline: '2025-09-01',
        riskProfile: 'low'
      })
      CREATE (g2:Goal {
        id: 'goal-002',
        name: 'Nové auto',
        type: 'savings',
        targetAmount: 350000,
        currentAmount: 120000,
        deadline: '2027-01-01',
        riskProfile: 'medium'
      })
      CREATE (g3:Goal {
        id: 'goal-003',
        name: 'Penzijní fond',
        type: 'investment',
        targetAmount: 2000000,
        currentAmount: 245000,
        deadline: '2055-01-01',
        riskProfile: 'high'
      })

      CREATE (u)-[:CONTRIBUTES_TO {transactionHistory: ['tx-dec-019', 'tx-nov-012']}]->(g1)
      CREATE (t19)-[:CONTRIBUTES_TO]->(g1)
      CREATE (t32)-[:CONTRIBUTES_TO]->(g1)
    `)

        // ─────────────────────────────────────────
        // ROZPOČET
        // ─────────────────────────────────────────
        console.log('📊 Vytváření rozpočtu...')
        await session.run(`
      MATCH (u:User {id: 'user-001'})

      CREATE (b1:BudgetPlan {
        id: 'budget-dec-2024',
        month: '2024-12',
        notes: 'Vánoční měsíc – vyšší výdaje na jídlo a dárky'
      })

      CREATE (u)-[:FOLLOWS_BUDGET {month: '2024-12', adherence: 0.82}]->(b1)
    `)

        console.log('✅ Seed dokončen!')
        console.log('')
        console.log('📈 Přehled dat:')
        console.log('   • 1 uživatel (Jan Novák)')
        console.log('   • 3 účty (KB Běžný, KB Spořicí, Revolut)')
        console.log('   • 3 karty')
        console.log('   • 17 kategorií (s hierarchií)')
        console.log('   • 13 obchodníků')
        console.log('   • ~33 transakcí (prosinec + listopad 2024)')
        console.log('   • 1 anomální transakce')
        console.log('   • 3 finanční cíle')
        console.log('   • 1 rozpočet')

    } catch (err) {
        console.error('❌ Chyba při seedování:', err)
        throw err
    } finally {
        await session.close()
        await closeDriver()
    }
}

seed()

// Spustit samostatně pro přidání aktuálních dat:
// Funkce pro přidání transakcí pro aktuální měsíc
export const seedCurrentMonth = async () => {
    const driver = getDriver()
    const session = driver.session()
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const prefix = `${year}-${month}`

    try {
        await session.run(`
      MATCH (acc1:Account {id: 'acc-001'})
      MATCH (mAlbert:Merchant  {id: 'm-albert'})
      MATCH (mSushibar:Merchant{id: 'm-sushibar'})
      MATCH (mNetflix:Merchant {id: 'm-netflix'})
      MATCH (mSpotify:Merchant {id: 'm-spotify'})
      MATCH (mDisney:Merchant  {id: 'm-disney'})
      MATCH (mNajemne:Merchant {id: 'm-najemne'})
      MATCH (mHolmes:Merchant  {id: 'm-holmes'})
      MATCH (mShell:Merchant   {id: 'm-shell'})
      MATCH (catPotraviny:Category {id: 'cat-potraviny'})
      MATCH (catRestaurace:Category{id: 'cat-restaurace'})
      MATCH (catStreaming:Category {id: 'cat-streaming'})
      MATCH (catBydleni:Category   {id: 'cat-bydleni'})
      MATCH (catSport:Category     {id: 'cat-sport'})
      MATCH (catAuto:Category      {id: 'cat-auto'})
      MATCH (catPrijmy:Category    {id: 'cat-prijmy'})

      CREATE (t1:Transaction { id: $id1, date: $d1, amount: 62000, description: 'Výplata', type: 'income', status: 'completed' })
      CREATE (t1)-[:FROM]->(acc1) CREATE (t1)-[:CATEGORIZED_AS {confidence: 1.0}]->(catPrijmy)

      CREATE (t2:Transaction { id: $id2, date: $d2, amount: 14500, description: 'Nájem', type: 'expense', status: 'completed' })
      CREATE (t2)-[:FROM]->(acc1) CREATE (t2)-[:SPENT_AT]->(mNajemne) CREATE (t2)-[:CATEGORIZED_AS {confidence: 1.0}]->(catBydleni)

      CREATE (t3:Transaction { id: $id3, date: $d3, amount: 756, description: 'Albert nákup', type: 'expense', status: 'completed' })
      CREATE (t3)-[:FROM]->(acc1) CREATE (t3)-[:SPENT_AT]->(mAlbert) CREATE (t3)-[:CATEGORIZED_AS {confidence: 0.98}]->(catPotraviny)

      CREATE (t4:Transaction { id: $id4, date: $d4, amount: 490, description: 'Sushi oběd', type: 'expense', status: 'completed' })
      CREATE (t4)-[:FROM]->(acc1) CREATE (t4)-[:SPENT_AT]->(mSushibar) CREATE (t4)-[:CATEGORIZED_AS {confidence: 0.95}]->(catRestaurace)

      CREATE (t5:Transaction { id: $id5, date: $d5, amount: 199, description: 'Netflix', type: 'expense', status: 'completed' })
      CREATE (t5)-[:FROM]->(acc1) CREATE (t5)-[:SPENT_AT]->(mNetflix) CREATE (t5)-[:CATEGORIZED_AS {confidence: 1.0}]->(catStreaming)

      CREATE (t6:Transaction { id: $id6, date: $d6, amount: 159, description: 'Spotify', type: 'expense', status: 'completed' })
      CREATE (t6)-[:FROM]->(acc1) CREATE (t6)-[:SPENT_AT]->(mSpotify) CREATE (t6)-[:CATEGORIZED_AS {confidence: 1.0}]->(catStreaming)

      CREATE (t7:Transaction { id: $id7, date: $d7, amount: 199, description: 'Disney+', type: 'expense', status: 'completed' })
      CREATE (t7)-[:FROM]->(acc1) CREATE (t7)-[:SPENT_AT]->(mDisney) CREATE (t7)-[:CATEGORIZED_AS {confidence: 1.0}]->(catStreaming)

      CREATE (t8:Transaction { id: $id8, date: $d8, amount: 990, description: 'Holmes Place', type: 'expense', status: 'completed' })
      CREATE (t8)-[:FROM]->(acc1) CREATE (t8)-[:SPENT_AT]->(mHolmes) CREATE (t8)-[:CATEGORIZED_AS {confidence: 1.0}]->(catSport)

      CREATE (t9:Transaction { id: $id9, date: $d9, amount: 1200, description: 'Shell benzín', type: 'expense', status: 'completed' })
      CREATE (t9)-[:FROM]->(acc1) CREATE (t9)-[:SPENT_AT]->(mShell) CREATE (t9)-[:CATEGORIZED_AS {confidence: 0.97}]->(catAuto)

      CREATE (t10:Transaction { id: $id10, date: $d10, amount: 12000, description: 'Freelance faktura', type: 'income', status: 'completed' })
      CREATE (t10)-[:FROM]->(acc1) CREATE (t10)-[:CATEGORIZED_AS {confidence: 1.0}]->(catPrijmy)
    `, {
            id1: `tx-cur-001`, d1: `${prefix}-01`,
            id2: `tx-cur-002`, d2: `${prefix}-02`,
            id3: `tx-cur-003`, d3: `${prefix}-05`,
            id4: `tx-cur-004`, d4: `${prefix}-07`,
            id5: `tx-cur-005`, d5: `${prefix}-05`,
            id6: `tx-cur-006`, d6: `${prefix}-05`,
            id7: `tx-cur-007`, d7: `${prefix}-05`,
            id8: `tx-cur-008`, d8: `${prefix}-01`,
            id9: `tx-cur-009`, d9: `${prefix}-10`,
            id10:`tx-cur-010`, d10:`${prefix}-15`,
        })
        console.log(`✅ Přidána data pro ${prefix}`)
    } finally {
        await session.close()
        await closeDriver()
    }
}

seedCurrentMonth()