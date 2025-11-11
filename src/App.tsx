import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminAuthProvider } from "@/hooks/useAdminAuth";
import { ClientAuthProvider } from "@/hooks/useClientAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import DashboardLayout from "@/components/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminAuth from "./pages/AdminAuth";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";

import SettingsPage from "./pages/SettingsPage";
import UserManagement from "./pages/UserManagement";
import SupportTickets from "./pages/SupportTickets";
import AdminDashboard from "./pages/AdminDashboard";
import AdminTemplateManagement from "./pages/AdminTemplateManagement";
import TemplateManagement from "./pages/TemplateManagement";
import ContactManagement from "./pages/ContactManagement";
import ListContacts from "./pages/ListContacts";

import ClientManagement from "./pages/ClientManagement";
import MediaManagement from "./pages/MediaManagement";
import TimezoneTest from "./pages/TimezoneTest";
import ClientDetail from "./pages/ClientDetail";
import Reports from "./pages/Reports";

import CampaignDetails from "./pages/CampaignDetails";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AdminAuthProvider>
        <ClientAuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin-auth" element={<AdminAuth />} />
              
              {/* Client routes */}
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

              <Route path="/timezone-test" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <TimezoneTest />
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
              
                             {/* Admin routes */}
               <Route path="/admin" element={
                 <AdminRoute>
                   <DashboardLayout>
                     <AdminDashboard />
                   </DashboardLayout>
                 </AdminRoute>
               } />
               <Route path="/admin/dashboard" element={
                 <AdminRoute>
                   <DashboardLayout>
                     <AdminDashboard />
                   </DashboardLayout>
                 </AdminRoute>
               } />
               <Route path="/admin/clients" element={
                 <AdminRoute>
                   <DashboardLayout>
                     <ClientManagement />
                   </DashboardLayout>
                 </AdminRoute>
               } />
               <Route path="/admin/client/:clientId" element={
                 <AdminRoute>
                   <DashboardLayout>
                     <ClientDetail />
                   </DashboardLayout>
                 </AdminRoute>
               } />
               <Route path="/admin/contacts/:listId" element={
                 <AdminRoute>
                   <DashboardLayout>
                     <ListContacts />
                   </DashboardLayout>
                 </AdminRoute>
               } />
               <Route path="/admin/templates" element={
                 <AdminRoute>
                   <DashboardLayout>
                     <AdminTemplateManagement />
                   </DashboardLayout>
                 </AdminRoute>
               } />
              <Route path="/users" element={
                <AdminRoute>
                  <DashboardLayout>
                    <UserManagement />
                  </DashboardLayout>
                </AdminRoute>
              } />
              
              {/* Catch all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ClientAuthProvider>
      </AdminAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
