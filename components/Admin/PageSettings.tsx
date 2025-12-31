
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
  ExternalLink as LinkIcon
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

  // Specifically detect the JSSDK error to show a better guide
  const isJSSDKError = error?.toLowerCase().includes('jssdk') || error?.toLowerCase().includes('javascript sdk');

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
        setError("Login successful, but no managed pages found. Ensure you are an Admin of the pages.");
      } else {
        userPages.forEach(p => addPage(p));
      }
    } catch (err: any) {
      console.error("FB Login Error:", err);
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
        <div className="flex flex-col items-end gap-2">
           <button 
            onClick={handleConnect}
            disabled={isConnecting || !sdkReady || !isConfigured || !isSecure}
            className={`flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-bold transition-all shadow-xl ${
              isJSSDKError ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#1877F2] hover:bg-[#166fe5]'
            } text-white disabled:opacity-50`}
          >
            <Facebook size={20} /> {isConnecting ? 'Opening Meta...' : 'Connect via Facebook'}
          </button>
          {!isSecure && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">HTTPS Required for Login</p>}
        </div>
      </div>

      {error && (
        <div className={`p-8 rounded-[32px] border ${isJSSDKError ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'} animate-in slide-in-from-top-4`}>
          <div className="flex gap-4">
            <div className={`p-3 rounded-2xl h-fit ${isJSSDKError ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
              <AlertCircle size={24} />
            </div>
            <div className="space-y-4">
              <h3 className={`text-lg font-bold ${isJSSDKError ? 'text-amber-800' : 'text-red-800'}`}>
                {isJSSDKError ? 'Meta Configuration Required' : 'Connection Error'}
              </h3>
              <p className={`text-sm leading-relaxed ${isJSSDKError ? 'text-amber-700' : 'text-red-700'}`}>
                {error}
              </p>
              
              {isJSSDKError && (
                <div className="bg-white/50 p-6 rounded-2xl border border-amber-200/50 space-y-4">
                   <p className="text-xs font-bold text-amber-800 uppercase tracking-widest">How to fix this:</p>
                   <ol className="text-sm text-amber-900 space-y-3 list-decimal list-inside font-medium">
                     <li>Go to your <a href="https://developers.facebook.com/" target="_blank" className="underline font-bold text-blue-600 inline-flex items-center gap-1">Meta App Dashboard <LinkIcon size={12}/></a></li>
                     <li>Navigate to <strong>Facebook Login</strong> -> <strong>Settings</strong> in the left menu.</li>
                     <li>Find the <strong>"Login with the JavaScript SDK"</strong> toggle.</li>
                     <li>Switch it to <strong>"Yes"</strong>.</li>
                     <li>Add this site's domain to <strong>"Allowed Domains for the JavaScript SDK"</strong>.</li>
                     <li>Click <strong>Save Changes</strong> and try connecting again here.</li>
                   </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!pages.length && !error && (
        <div className="bg-white p-12 rounded-[40px] border border-slate-100 shadow-sm text-center space-y-4">
           <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[32px] flex items-center justify-center mx-auto mb-4">
              <Facebook size={40} />
           </div>
           <h3 className="text-2xl font-bold text-slate-800">No Pages Linked</h3>
           <p className="text-slate-500 max-w-sm mx-auto">Authorize your Meta account to fetch the business pages you manage and start assigning agents.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pages.map((page) => (
          <div key={page.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-lg hover:border-blue-100 transition-all duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#1877F2]">
                  <Facebook size={24} />
                </div>
                <button 
                  onClick={() => setAssigningPage(page)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                >
                  <UserPlus size={14} /> Assign Agents
                </button>
              </div>
              <h3 className="text-xl font-bold text-slate-800">{page.name}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{page.category}</p>
              
              <div className="mt-8 flex flex-wrap gap-2">
                {(page.assignedAgentIds || []).length > 0 ? (
                  page.assignedAgentIds.map(id => {
                    const agent = agents.find(a => a.id === id);
                    return agent ? (
                      <div key={id} className="flex items-center gap-2 pl-1 pr-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold border border-blue-100">
                         <img src={agent.avatar} className="w-6 h-6 rounded-full" />
                         {agent.name.split(' ')[0]}
                      </div>
                    ) : null;
                  })
                ) : (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                    <Info size={12} /> No Agents Assigned
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-auto p-4 bg-slate-50/80 border-t border-slate-100 flex items-center gap-3">
               <button 
                onClick={() => simulateIncomingWebhook(page.id)}
                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-white border border-slate-200 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
               >
                  Test Webhook Record
               </button>
               <button 
                onClick={() => removePage(page.id)} 
                className="p-4 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"
                title="Remove Page"
               >
                  <Trash2 size={20} />
               </button>
            </div>
          </div>
        ))}
      </div>

      {assigningPage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-md p-10 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="text-2xl font-bold text-slate-800">Assign Agents</h3>
                 <button onClick={() => setAssigningPage(null)} className="p-3 text-slate-400 hover:bg-slate-50 rounded-full transition-colors"><X size={28} /></button>
              </div>
              <p className="text-sm text-slate-500 mb-8">Select who can access conversations for <span className="font-bold text-slate-800">{assigningPage.name}</span>.</p>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                {agents.map(agent => (
                  <button 
                    key={agent.id}
                    onClick={() => toggleAgent(assigningPage.id, agent.id)}
                    className={`w-full flex items-center justify-between p-5 rounded-3xl border transition-all ${
                      (assigningPage.assignedAgentIds || []).includes(agent.id)
                        ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-50' 
                        : 'bg-white border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                       <img src={agent.avatar} className="w-12 h-12 rounded-2xl shadow-sm" />
                       <div className="text-left">
                          <p className="text-sm font-bold text-slate-800">{agent.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{agent.role}</p>
                       </div>
                    </div>
                    {(assigningPage.assignedAgentIds || []).includes(agent.id) && (
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-sm">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setAssigningPage(null)}
                className="w-full mt-8 py-5 bg-slate-900 text-white rounded-3xl font-bold hover:bg-slate-800 transition-all shadow-xl active:scale-[0.98]"
              >
                Save Assignments
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default PageSettings;
