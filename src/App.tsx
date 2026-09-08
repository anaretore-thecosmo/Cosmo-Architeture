import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DesktopHeader } from './components/DesktopHeader';
import { MobileHeader } from './components/MobileHeader';
import { MobileNavigation } from './components/MobileNavigation';
import { HomeView } from './components/HomeView';
import { NewProjectOnboarding } from './features/onboarding/NewProjectOnboarding';
import { ProjectDetailView } from './components/ProjectDetailView';
import { Project, StartingPoint } from './domain/project/types';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'onboarding' | 'project_detail'>('home');
  const [selectedStartingPoint, setSelectedStartingPoint] = useState<StartingPoint | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const handleStartOnboarding = (startingPoint?: StartingPoint | null) => {
    setSelectedStartingPoint(startingPoint || null);
    setCurrentView('onboarding');
  };

  const handleCancelOnboarding = () => {
    setCurrentView('home');
    setSelectedStartingPoint(null);
  };

  const handleProjectCreated = (_project: Project) => {
    // Retorna para a Home e atualiza a listagem
    setRefreshTrigger((prev) => prev + 1);
    setCurrentView('home');
    setSelectedStartingPoint(null);
  };

  const handleOpenProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentView('project_detail');
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setSelectedProject(null);
  };

  return (
    <div
      id="app-root"
      className="min-h-screen bg-[#F3F0E9] text-[#272C2B] font-sans antialiased overflow-x-hidden relative"
    >
      {/* Menu Lateral Fixo Desktop (>= 900px) */}
      <Sidebar
        activeItem={currentView === 'home' ? 'hoje' : 'meus-projetos'}
        onNewProject={() => handleStartOnboarding(null)}
        onNavigateHome={handleBackToHome}
      />

      {/* Área Principal (Desktop >= 900px ajusta com margem/padding à esquerda de 250px) */}
      <div className="flex flex-col min-h-screen min-[900px]:pl-[250px] w-full">
        {/* Cabeçalho Desktop (>= 900px) */}
        <DesktopHeader />

        {/* Cabeçalho Mobile (< 900px) */}
        <MobileHeader />

        {/* Conteúdo Principal */}
        <main
          id="main-content-area"
          className="flex-1 w-full px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 pb-24 min-[900px]:pb-10"
        >
          {currentView === 'home' && (
            <HomeView
              onStartOnboarding={handleStartOnboarding}
              onOpenProject={handleOpenProject}
              refreshTrigger={refreshTrigger}
            />
          )}

          {currentView === 'onboarding' && (
            <NewProjectOnboarding
              initialStartingPoint={selectedStartingPoint}
              onCancel={handleCancelOnboarding}
              onProjectCreated={handleProjectCreated}
            />
          )}

          {currentView === 'project_detail' && selectedProject && (
            <ProjectDetailView
              project={selectedProject}
              onBack={handleBackToHome}
            />
          )}
        </main>
      </div>

      {/* Navegação Inferior Mobile (< 900px) */}
      <MobileNavigation
        activeTab={currentView === 'home' ? 'hoje' : 'projetos'}
        onNewProject={() => handleStartOnboarding(null)}
        onNavigateHome={handleBackToHome}
      />
    </div>
  );
}
