
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
  X,
  Info,
  ExternalLink as LinkIcon,
  ShieldAlert,
  Terminal,
  ArrowRight
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

  const isJSSDKError = error?.toLowerCase().includes('jssdk') || 
                       error?.toLowerCase().includes('javascript sdk') || 
                       error?.toLowerCase().includes('disabled');

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
        setError("Login successful, but no managed pages found. Ensure you are an Admin of the pages and they are linked to the app.");
      } else {
        for (const p of userPages) {
          await addPage(p);
        }
      }
    } catch (err: any) {
      console.error("FB Login Error Details:", err);
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
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative">
         <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
            <Facebook size={12} /> App ID: 1148755260666274
         </div>
         <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
           isSecure ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
         }`}>
            <ShieldAlert size={12} /> SSL: {isSecure ? 'Secure' : 'Unsecured (Fix Required)'}
         </div>
         <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
           sdkReady ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
         }`}>
            <Terminal size={12} /> SDK: {sdkReady ? 'Ready' : 'Initializing...'}
         </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Pages & Messaging</h2>
          <p className="text-slate-500 text-lg max-w-xl">Link your Meta assets and assign support agents.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
           <button 
            onClick={handleConnect}
            disabled={isConnecting || !sdkReady || !isConfigured || !isSecure}
            className={`flex items-center justify-center gap-3 px-10 py-5 rounded-3xl font-black uppercase tracking-[0.1em] transition-all shadow-xl group active:scale-95 ${
              isJSSDKError ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#1877F2] hover:bg-[#166fe5]'
            } text-white disabled:opacity-50`}
          >
            <Facebook size={20} className="group-hover:rotate-12 transition-transform" /> 
            {isConnecting ? 'Waiting for Meta...' : 'Connect Facebook Account'}
          </button>
        </div>
      </div>

      {error && (
        <div className={`p-8 md:p-12 rounded-[48px] border-4 shadow-2xl animate-in slide-in-from-top-4 duration-500 ${isJSSDKError ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex flex-col md:flex-row gap-8">
            <div className={`p-6 rounded-3xl h-fit flex-shrink-0 flex items-center justify-center ${isJSSDKError ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
              {isJSSDKError ? <ShieldAlert size={48} strokeWidth={2.5} /> : <AlertCircle size={48} strokeWidth={2.5} />}
            </div>
            
            <div className="space-y-6 flex-1">
              <div className="space-y-2">
                <h3 className={`text-3xl font-black uppercase tracking-tight ${isJSSDKError ? 'text-amber-800' : 'text-red-800'}`}>
                  {isJSSDKError ? 'Action Required: Enable JSSDK' : 'Connection Blocked'}
                </h3>
                <p className={`text-lg leading-relaxed font-medium ${isJSSDKError ? 'text-amber-700/80' : 'text-red-700/80'}`}>
                  {error}
                </p>
              </div>
              
              {isJSSDKError && (
                <div className="bg-white p-8 rounded-[32px] border-2 border-amber-200/50 space-y-8 shadow-inner">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-sm">1</div>
                      <p className="text-amber-900 font-bold">Open your Meta App Dashboard</p>
                   </div>
                   <a 
                    href="https://developers.facebook.com/apps/1148755260666274/fb-login/settings/" 
                    target="_blank" 
                    className="inline-flex items-center gap-3 px-8 py-4 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-all shadow-lg"
                   >
                     Go to Login Settings <LinkIcon size={18}/>
                   </a>

                   <div className="space-y-4 pt-4">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-sm">2</div>
                        <p className="text-amber-900 font-bold">Locate the toggle below and switch to <span className="text-emerald-600">YES</span>:</p>
                     </div>
                     <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 flex items-center justify-between">
                        <span className="font-bold text-slate-700">Login with the JavaScript SDK</span>
                        <div className="w-14 h-7 bg-emerald-500 rounded-full flex items-center px-1">
                           <div className="w-5 h-5 bg-white rounded-full ml-auto shadow-sm"></div>
                        </div>
                     </div>
                   </div>

                   <div className="flex items-center gap-3 pt-4">
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-sm">3</div>
                      <p className="text-amber-900 font-bold">Add this domain to <span className="underline italic">"Allowed Domains for the JavaScript SDK"</span> list and Save.</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!pages.length && !error && (
        <div className="bg-white p-20 rounded-[64px] border border-slate-100 shadow-sm text-center space-y-6">
           <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[40px] flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Facebook size={48} />
           </div>
           <h3 className="text-3xl font-black text-slate-800">Ready to Connect</h3>
           <p className="text-slate-500 max-w-md mx-auto text-lg leading-relaxed">Click the connect button above to grant MessengerFlow access to your Facebook Business Pages.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {pages.map((page) => (
          <div key={page.id} className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl hover:border-blue-100 transition-all duration-500">
            <div className="p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-[#1877F2]">
                  <Facebook size={32} />
                </div>
                <button 
                  onClick={() => setAssigningPage(page)}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95"
                >
                  <UserPlus size={16} /> Manage Access
                </button>
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{page.name}</h3>
              <p className="text-[12px] font-black text-blue-500/60 uppercase tracking-widest mt-1">{page.category}</p>
              
              <div className="mt-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Authorized Agents</p>
                <div className="flex flex-wrap gap-3">
                  {(page.assignedAgentIds || []).length > 0 ? (
                    page.assignedAgentIds.map(id => {
                      const agent = agents.find(a => a.id === id);
                      return agent ? (
                        <div key={id} className="flex items-center gap-2 pl-1 pr-4 py-1.5 bg-slate-50 text-slate-700 rounded-full text-[11px] font-bold border border-slate-100 group/item hover:bg-blue-50 hover:border-blue-200 transition-colors">
                           <img src={agent.avatar} className="w-7 h-7 rounded-full object-cover shadow-sm" />
                           {agent.name}
                        </div>
                      ) : null;
                    })
                  ) : (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest bg-amber-50 px-4 py-2 rounded-2xl border border-amber-100">
                      <Info size={14} /> Assign Agents to start handling chats
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-auto p-6 bg-slate-50/50 border-t border-slate-100 flex items-center gap-4">
               <button 
                onClick={() => simulateIncomingWebhook(page.id)}
                className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-slate-700 bg-white border border-slate-200 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 group/test"
               >
                  <RefreshCw size={16} className="group-hover/test:rotate-180 transition-transform duration-500" />
                  Test Live Incoming
               </button>
               <button 
                onClick={() => removePage(page.id)} 
                className="p-4 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"
                title="Disconnect Page"
               >
                  <Trash2 size={24} />
               </button>
            </div>
          </div>
        ))}
      </div>

      {assigningPage && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white rounded-[56px] shadow-[0_0_100px_rgba(0,0,0,0.2)] w-full max-w-md p-12 animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-3xl font-black text-slate-800 tracking-tight">Agent Permissions</h3>
                 <button onClick={() => setAssigningPage(null)} className="p-3 text-slate-400 hover:bg-slate-50 rounded-full transition-colors"><X size={32} /></button>
              </div>
              <p className="text-slate-500 mb-10 text-lg">Who is authorized to chat for <span className="font-bold text-slate-900 underline decoration-blue-50">{assigningPage.name}</span>?</p>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                {agents.map(agent => (
                  <button 
                    key={agent.id}
                    onClick={() => toggleAgent(assigningPage.id, agent.id)}
                    className={`w-full flex items-center justify-between p-6 rounded-[32px] border-2 transition-all group ${
                      (assigningPage.assignedAgentIds || []).includes(agent.id)
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200' 
                        : 'bg-white border-slate-100 hover:border-blue-400 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-5 text-left">
                       <img src={agent.avatar} className="w-14 h-14 rounded-2xl shadow-lg group-hover:scale-110 transition-transform" />
                       <div>
                          <p className="text-lg font-black leading-tight">{agent.name}</p>
                          <p className={`text-[10px] uppercase font-black tracking-[0.2em] mt-1 ${
                            (assigningPage.assignedAgentIds || []).includes(agent.id) ? 'text-blue-100' : 'text-slate-400'
                          }`}>{agent.role}</p>
                       </div>
                    </div>
                    {(assigningPage.assignedAgentIds || []).includes(agent.id) && (
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm">
                        <CheckCircle2 size={20} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setAssigningPage(null)}
                className="w-full mt-10 py-6 bg-slate-900 text-white rounded-[32px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3"
              >
                Save & Update Portal <ArrowRight size={20} />
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default PageSettings;
