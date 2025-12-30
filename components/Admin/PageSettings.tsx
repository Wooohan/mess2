
import React, { useState, useEffect } from 'react';
import { 
  Facebook, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  Settings2,
  ExternalLink,
  ChevronRight,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { loginWithFacebook, fetchUserPages, initFacebookSDK, isSecureOrigin, isAppIdConfigured } from '../../services/facebookService';
import { FacebookPage, User } from '../../types';

const PageSettings: React.FC = () => {
  const { pages, addPage, removePage, updatePage, agents, simulateIncomingWebhook } = useApp();
  const [isConnecting, setIsConnecting] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assigningPage, setAssigningPage] = useState<FacebookPage | null>(null);
  
  const isSecure = isSecureOrigin();
  const isConfigured = isAppIdConfigured();

  useEffect(() => {
    initFacebookSDK().then(() => setSdkReady(true));
  }, []);

  const handleConnect = async () => {
    if (!sdkReady) return;
    setIsConnecting(true);
    setError(null);

    try {
      await loginWithFacebook();
      const userPages = await fetchUserPages();
      
      if (userPages.length === 0) {
        setError("Login successful, but no managed pages found.");
      } else {
        userPages.forEach(p => addPage(p));
      }
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'Meta connection failed.');
    } finally {
      setIsConnecting(false);
    }
  };

  const toggleAgent = (pageId: string, agentId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;

    const currentIds = page.assignedAgentIds || [];
    const newIds = currentIds.includes(agentId) 
      ? currentIds.filter(id => id !== agentId)
      : [...currentIds, agentId];
    
    updatePage(pageId, { assignedAgentIds: newIds });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">FB Pages & Assignments</h2>
          <p className="text-slate-500 text-lg max-w-xl">Link your pages and define which agents handle the conversations.</p>
        </div>
        <button 
          onClick={handleConnect}
          disabled={isConnecting || !sdkReady || !isConfigured || !isSecure}
          className="flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-bold transition-all shadow-xl bg-[#1877F2] text-white hover:bg-[#166fe5]"
        >
          <Facebook size={20} /> Connect via Facebook
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pages.map((page) => (
          <div key={page.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col group">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#1877F2]">
                  <Facebook size={24} />
                </div>
                <button 
                  onClick={() => setAssigningPage(page)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                >
                  <UserPlus size={14} /> Assign Agents
                </button>
              </div>
              <h3 className="text-xl font-bold text-slate-800">{page.name}</h3>
              
              <div className="mt-6 flex flex-wrap gap-2">
                {(page.assignedAgentIds || []).length > 0 ? (
                  page.assignedAgentIds.map(id => {
                    const agent = agents.find(a => a.id === id);
                    return agent ? (
                      <div key={id} className="flex items-center gap-2 pl-1 pr-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold border border-blue-100">
                         <img src={agent.avatar} className="w-5 h-5 rounded-full" />
                         {agent.name.split(' ')[0]}
                      </div>
                    ) : null;
                  })
                ) : (
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">No agents assigned</span>
                )}
              </div>
            </div>
            
            <div className="mt-auto p-4 bg-slate-50/80 border-t border-slate-100 flex items-center gap-3">
               <button 
                onClick={() => simulateIncomingWebhook(page.id)}
                className="flex-1 py-3 text-xs font-bold text-blue-600 bg-white border border-slate-200 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
               >
                  Test Webhook
               </button>
               <button onClick={() => removePage(page.id)} className="p-3 text-slate-400 hover:text-red-500 rounded-xl transition-all">
                  <Trash2 size={18} />
               </button>
            </div>
          </div>
        ))}
      </div>

      {assigningPage && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md p-10 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="text-2xl font-bold text-slate-800">Assign Agents</h3>
                 <button onClick={() => setAssigningPage(null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full"><X size={24} /></button>
              </div>
              <p className="text-sm text-slate-500 mb-8">Select who can access conversations for <span className="font-bold">{assigningPage.name}</span>.</p>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {agents.map(agent => (
                  <button 
                    key={agent.id}
                    onClick={() => toggleAgent(assigningPage.id, agent.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      (assigningPage.assignedAgentIds || []).includes(agent.id)
                        ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-50' 
                        : 'bg-white border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                       <img src={agent.avatar} className="w-10 h-10 rounded-xl" />
                       <div className="text-left">
                          <p className="text-sm font-bold text-slate-800">{agent.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-black">{agent.role}</p>
                       </div>
                    </div>
                    {(assigningPage.assignedAgentIds || []).includes(agent.id) && <CheckCircle2 className="text-blue-600" size={20} />}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setAssigningPage(null)}
                className="w-full mt-8 py-5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl"
              >
                Finished
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default PageSettings;
