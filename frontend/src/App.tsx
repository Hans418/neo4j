import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Dashboard }          from '@/pages/Dashboard'
import { Transactions }       from '@/pages/Transactions'
import { SpendingAnalytics }  from '@/pages/SpendingAnalytics'
import { Budget }             from '@/pages/Budget'
import { Goals }              from '@/pages/Goals'
import { Recommendations }    from '@/pages/Recommendations'
import { Analytics }          from '@/pages/Analytics'

export const App = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/"                   element={<Dashboard />} />
        <Route path="/transactions"       element={<Transactions />} />
        <Route path="/analytics/spending" element={<SpendingAnalytics />} />
        <Route path="/budget"             element={<Budget />} />
        <Route path="/goals"              element={<Goals />} />
        <Route path="/recommendations"    element={<Recommendations />} />
        <Route path="/analytics"          element={<Analytics />} />
      </Route>
    </Routes>
  </BrowserRouter>
)
