import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClientAuthProvider } from "@/hooks/useClientAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import SettingsPage from "./pages/SettingsPage";
import SupportTickets from "./pages/SupportTickets";
import TemplateManagement from "./pages/TemplateManagement";
import ContactManagement from "./pages/ContactManagement";
import ListContacts from "./pages/ListContacts";
import MediaManagement from "./pages/MediaManagement";
import Reports from "./pages/Reports";
import CampaignDetails from "./pages/CampaignDetails";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ClientAuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/campaigns" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Campaigns />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/templates" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TemplateManagement />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/contacts" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ContactManagement />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/contacts/list/:listId" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ListContacts />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SettingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/support" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SupportTickets />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/media" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MediaManagement />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Reports />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/campaign/:campaignId" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CampaignDetails />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            {/* Catch all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ClientAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
