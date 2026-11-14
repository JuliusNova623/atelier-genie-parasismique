/* =====================================================================
   calc.js — FONCTIONS DE CALCUL UNIQUES (une par exercice)
   Toutes les valeurs affichées (étapes, laboratoires, variantes, QCM)
   viennent de ces fonctions. Ne pas recopier de nombres à la main ailleurs.
   ===================================================================== */
const PI=Math.PI;
const nf=(x,d=4)=>{ if(!isFinite(x)) return '—'; const s=Number(x.toPrecision(d)); return s.toLocaleString('fr-FR',{maximumFractionDigits:12}).replace(/[\u00a0\u202f]/g,'\u202f').replace('-','−'); };
const sci=(x,d=4)=>{ const e=Math.floor(Math.log10(Math.abs(x))); const m=x/Math.pow(10,e); return nf(m,d)+'·10<sup>'+String(e).replace('-','−')+'</sup>'; };
const tn=(x,d=4)=>nf(x,d).replace(/,/g,'{,}').replace(/[\s\u00a0\u202f]/g,'\\,').replace(/−/g,'-');
const tsci=(x,d=4)=>{ const e=Math.floor(Math.log10(Math.abs(x))); const m=x/Math.pow(10,e); return tn(m,d)+'\\cdot 10^{'+e+'}'; };
const srss=(...a)=>Math.sqrt(a.reduce((s,x)=>s+x*x,0));
const sum=a=>a.reduce((s,x)=>s+x,0);

/* Spectre de calcul EC8 (branches du cours C5) : ag = γI·agR */
function sdEC8(T,p){ // p:{ag,S,TB,TC,TD,q,beta}
  const ag=p.ag,S=p.S,q=p.q,b=p.beta??0.2;
  if(T<=p.TB) return ag*S*(2/3+T/p.TB*(2.5/q-2/3));
  if(T<=p.TC) return ag*S*2.5/q;
  if(T<=p.TD) return Math.max(ag*S*2.5/q*p.TC/T,b*ag);
  return Math.max(ag*S*2.5/q*p.TC*p.TD/(T*T),b*ag);
}

/* ---------------- TD1 : silo, oscillateur libre amorti ---------------- */
const TD1={P:200,h:5,a:0.3,E:21000,m:100,nc:4,n:5,ratio:0.1,t1:2};
function calc(p){
  const I=Math.pow(p.a,4)/12, EI=p.E*1e6*I, k1=12*EI/Math.pow(p.h,3), k=p.nc*k1;
  const u0=p.P*1e3/k, delta=Math.log(1/p.ratio), x=delta/(2*PI*p.n), xi=x/Math.sqrt(1+x*x);
  const w0=Math.sqrt(k/(p.m*1e3)), T0=2*PI/w0, wD=w0*Math.sqrt(1-xi*xi), TD=2*PI/wD;
  const U=u0/Math.sqrt(1-xi*xi), phi=Math.atan(xi*w0/wD);
  return {p,I,EI,k1,k,u0,delta,x,xi,xiApprox:delta/(2*PI*p.n),w0,T0,wD,TD,U,phi};
}
function ut(c,t,conv){const arg=c.wD*t+(conv==='plus'?c.phi:-c.phi);return c.U*Math.exp(-c.xi*c.w0*t)*Math.cos(arg);}
function v0(c,conv){const ph=conv==='plus'?c.phi:-c.phi;return c.U*(-c.xi*c.w0*Math.cos(ph)-c.wD*Math.sin(ph));}
const D=calc(TD1);
const uT1=ut(D,TD1.t1,'minus'), uT1plus=ut(D,TD1.t1,'plus');
/* Chemin numérique du corrigé officiel TD1 (valeurs arrondies qu'il utilise) */
const TD1_OFF={u0:0.0367,xw0:0.538,wD:7.33,phi:0.073};
TD1_OFF.ex=Math.exp(-TD1_OFF.xw0*2); TD1_OFF.co=Math.cos(TD1_OFF.wD*2+TD1_OFF.phi); TD1_OFF.u=TD1_OFF.u0*TD1_OFF.ex*TD1_OFF.co;

/* ---------------- TD2 : château d'eau (1 ddl, console) ---------------- */
const TD2P={D:2.0,ep:0.30,L:15,E:31000,Mres:150,rho:2.5,plat:5,TC:0.4,fck:25,gc:1.3,fyk:500,gs:1.0,p:0.18,phi:25,enr:0.05};
function calcTD2(p){
  const d=p.D-2*p.ep, I=PI*(p.D**4-d**4)/64, K=3*p.E*1e6*I/p.L**3;
  const S=PI*(p.D**2-d**2)/4, Mfut=p.rho*p.L*S, X=33/136, Msis=p.Mres+X*Mfut;
  const T=2*PI*Math.sqrt(Msis*1e3/K), Sa=T<=p.TC?p.plat:p.plat*Math.pow(p.TC/T,2/3);
  const F=Msis*1e3*Sa, x=F/K, M=F*p.L, N=p.Mres*9.81+25*p.L*S; // kN si Mres en t
  const fcd=p.fck/p.gc, fyd=p.fyk/p.gs, mu=4*M/1e6/(PI*p.D**3*fcd), nu=4*N/1e3/(PI*p.D**2*fcd);
  const A=p.p*PI*p.D**2/4*fcd/fyd, Abar=PI*(p.phi/10)**2/4, per=PI*(p.D-2*p.enr), esp=per*Abar/(A*1e4);
  return {p,d,I,K,S,Mfut,X,Msis,T,Sa,F,x,M,N,fcd,fyd,mu,nu,A,Abar,per,esp};
}
const C2=calcTD2(TD2P);

/* ---------------- TD3 : pont-dalle 3 travées (1 ddl) ---------------- */
const TD3P={fck:35,G:1.0,e:0.06,ap:[0.40,0.40],ac:[0.40,0.35],bf:2.5,hf:0.8,Lf:5.5,af:0.8,Lc:4.0,Lt:35.621,ext:0.6,B:12.25,ep:0.6,gam:25,g:9.81,eq:4.7,frac:0.25,plat:7.2,TC:0.4,q:1,coefR:14.9};
function calcTD3(p){
  const Ecm=22000*Math.pow((p.fck+8)/10,0.3); // MPa
  const kn=p.G*p.ap[0]*p.ap[1]/p.e, k2n=2*kn, If=p.bf*p.hf**3/12, kf=3*Ecm*If/p.Lf**3, kfn=1/(1/kf+1/k2n), kp=2*kfn;
  const kcn=p.G*p.ac[0]*p.ac[1]/p.e, k4c=4*kcn, Ic=p.af**4/12, kfc=3*Ecm*Ic/p.Lc**3, k2fc=2*kfc, kcul=1/(1/k2fc+1/k4c);
  const kX=2*kcul+2*kp; // MN/m
  const rho=p.gam/p.g, Ll=p.Lt+2*p.ext, Mtab=rho*p.ep*p.B*Ll, Meq=p.eq*Ll, Mpil=2*(2*p.hf*p.bf*p.Lf*p.frac)*rho, Mtot=Mtab+Meq+2*Mpil; // t
  const Sa=T=>T<=p.TC?p.plat:p.plat*p.TC/T;
  const TX=2*PI*Math.sqrt(Mtot*1e3/(kX*1e6)), aX=Sa(TX), FX=Mtot*aX/1e3, dX=p.q*FX/kX; // MN, m
  const Fcul=kcul*dX, Fpile=kp*dX, Fappc=Fcul/4, Fappp=Fpile/4, Ffiab=1.5*1.1*Fpile;
  const kfcY=12*Ecm*Ic/p.Lc**3, kY=2*2*kfcY, TY=2*PI*Math.sqrt(Mtot*1e3/(kY*1e6)), aY=Sa(TY), FY=Mtot*aY/1e3;
  const kdeck=48*Ecm*1e6*(p.ep*p.B**3/12)/p.Lt**3/1e6, LB=Ll/p.B;
  // têtes et pieds de fût (kN, m)
  const gtab=p.B*p.ep*p.gam+p.eq*p.g, Rp=p.coefR*gtab, Xt=Fpile*1e3, Xf=Xt/2, Zt=Rp/2, Pf=p.Lf*p.bf*p.hf*p.gam, Zp=Zt+Pf;
  const H=p.Lf+p.e+p.ep/2, My=Xf*H, e0=My/Zp, ei=2*p.Lf/400, ee=Math.max(0.02,p.hf/30), e2=dX, My2=Zp*(e0+ei+ee+e2);
  const fcd=p.fck/1.3, dd=p.hf-0.06, MuA=My2+Zp*(dd-p.hf/2), mu=MuA/1e3/(p.bf*dd*dd*fcd), al=1.25*(1-Math.sqrt(1-2*mu)), Ast=(MuA/1e3/(dd*(1-0.4*al))-Zp/1e3)/500;
  // vibration propre d'un fût (console à masse répartie)
  const mlin=2*rho*p.bf*p.hf*1e3, Ipp=2*If, Tpile=PI*p.Lf**2*Math.sqrt(11*mlin/(34*Ecm*1e6*Ipp));
  return {p,Ecm,kn,k2n,If,kf,kfn,kp,kcn,k4c,Ic,kfc,k2fc,kcul,kX,rho,Ll,Mtab,Meq,Mpil,Mtot,TX,aX,FX,dX,Fcul,Fpile,Fappc,Fappp,Ffiab,kfcY,kY,TY,aY,FY,kdeck,LB,gtab,Rp,Xt,Xf,Zt,Pf,Zp,H,My,e0,ei,ee,e2,My2,fcd,dd,MuA,mu,al,xu:al*dd,Ast,mlin,Tpile};
}
const C3=calcTD3(TD3P);
/* Chemin numérique du corrigé officiel TD3 (pour comparaison) */
const TD3_OFF={M:890,TX:0.97,aX:2.97,FX:2.64,dX:0.072,MY:920,TY:0.19,FY:6.6,Zp:1942,My2:2324,mu:0.093,Ast:46};

/* ---------------- TD4 : brochette 3 ddl, analyse modale spectrale ---------------- */
const TD4P={fck:30,red:0.5,b:3.67,t:0.20,nv:6,h:10,m:100,S0:1.73,plat:2.16,TB:0.05,TC:0.25,q:3};
function jacobi(A){ // valeurs/vecteurs propres d'une matrice symétrique n×n
  const n=A.length; let a=A.map(r=>r.slice()), v=a.map((r,i)=>r.map((_,j)=>i===j?1:0));
  for(let it=0;it<100;it++){ let p=0,q=1,mx=0;
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(a[i][j])>mx){mx=Math.abs(a[i][j]);p=i;q=j;}
    if(mx<1e-12)break;
    const th=0.5*Math.atan2(2*a[p][q],a[q][q]-a[p][p]), c=Math.cos(th), s=Math.sin(th);
    for(let k=0;k<n;k++){const akp=a[k][p],akq=a[k][q];a[k][p]=c*akp-s*akq;a[k][q]=s*akp+c*akq;}
    for(let k=0;k<n;k++){const apk=a[p][k],aqk=a[q][k];a[p][k]=c*apk-s*aqk;a[q][k]=s*apk+c*aqk;}
    for(let k=0;k<n;k++){const vkp=v[k][p],vkq=v[k][q];v[k][p]=c*vkp-s*vkq;v[k][q]=s*vkp+c*vkq;}
  }
  return {val:a.map((r,i)=>r[i]),vec:v};
}
function calcTD4(p){
  const Ecm=22000*Math.pow((p.fck+8)/10,0.3), E=Ecm*p.red*1e6, I=2*(p.nv*p.t)*p.b**3/12, L=3*p.h, EI=E*I;
  const Kc=[[7,-16,12],[-16,44,-46],[12,-46,80]]; // ×81EI/(13L³), ordre (u3,u2,u1)
  const kf=81*EI/(13*L**3), mv=[p.m/2,p.m,p.m].map(x=>x*1e3);
  const A=Kc.map((r,i)=>r.map((x,j)=>x*kf/Math.sqrt(mv[i]*mv[j])));
  const J=jacobi(A); let modes=J.val.map((lam,k)=>({lam,phi:J.vec.map((r,i)=>r[k]/Math.sqrt(mv[i]))})).sort((a,b)=>a.lam-b.lam);
  const Sa=T=>T<=p.TB?p.S0+(p.plat-p.S0)*T/p.TB:(T<=p.TC?p.plat:p.plat*p.TC/T);
  const z=[3*p.h,2*p.h,p.h], mt=mv.map(x=>x/1e3); // tonnes
  modes=modes.map(o=>{const V=o.phi.map(x=>x/o.phi[2]); const w=Math.sqrt(o.lam), T=2*PI/w;
    const den=sum(V.map((x,i)=>mt[i]*x*x)), num=sum(V.map((x,i)=>mt[i]*x)), pst=num/den, Mmod=num*num/den;
    const nrm=Math.sqrt(den), Vn=V.map(x=>x/nrm), pn=num/nrm, s=Sa(T), a=Vn.map(x=>pn*s*x), F=a.map((x,i)=>mt[i]*x), u=a.map(x=>p.q*x/(w*w));
    return {w,T,V,coef:w/Math.sqrt(EI/(p.m*1e3*L**3)),pst,Mmod,den,nrm,Vn,pn,Sa:s,a,F,u,Vb:sum(F),Mb:sum(F.map((f,i)=>f*z[i]))};});
  const Vsrss=srss(...modes.map(o=>o.Vb)), Msrss=srss(...modes.map(o=>o.Mb)), Mtot=sum(mt), cqcOK=modes.every((o,i)=>i===0||o.T/modes[i-1].T<=0.9);
  return {p,Ecm,E,I,L,EI,modes,Vsrss,Msrss,Mtot,z,mt,cqcOK,Sa};
}
const C4=calcTD4(TD4P);
const TD4_OFF={w:[15.04,84.95,211.6],V2:119,M2:760,Vsrss:260,Msrss:5260};

/* ---------------- TD5 : bâtiment BA 5 niveaux ---------------- */
const TD5P={G:19830,CP:3120,Q:4160,psi2:0.3,phi:0.8,n:5,h:4,w1:10.74,w2:46.54,Mm1:1725,Mm2:470,S:1.5,gI:1.2,agR:1.6,q:3,TB:0.06,TC:0.4,TD:2,Lx:26,Ly:16,lw:6,tw:0.3,np:11,ap:0.4,dr:5.66,NG:3262,MG:15432,fck:25};
function calcTD5(p){
  const ME=(p.G+p.CP+p.phi*p.psi2*p.Q)/9.81; // t
  const T1=2*PI/p.w1, T2=2*PI/p.w2, pc1=p.Mm1/ME, pc2=p.Mm2/ME;
  const ag=p.gI*p.agR, plat=2.5*p.S*ag/p.q, A=plat*p.TC, H=p.n*p.h;
  const Ac=2*p.tw*p.lw*(0.2+Math.min(p.lw/H,0.9)**2), Ct=0.075/Math.sqrt(Ac), T1ec=Ct*H**0.75;
  const sp={ag,S:p.S,TB:p.TB,TC:p.TC,TD:p.TD,q:p.q}, Sd=sdEC8(T1,sp), Sdec=sdEC8(T1ec,sp);
  const lam=(p.n>=3&&T1<=2*p.TC)?0.85:1, Fd=Sd*ME*lam; // kN
  const mi=Array.from({length:p.n},(_,i)=>(p.G/p.n+p.CP/p.n+(i<p.n-1?p.phi*p.psi2*p.Q/(p.n-1):0))/9.81);
  const zi=mi.map((_,i)=>(i+1)*p.h), mz=mi.map((m,i)=>m*zi[i]), Fi=mz.map(x=>Fd*x/sum(mz)), Mov=sum(Fi.map((f,i)=>f*zi[i])), zeq=Mov/Fd;
  const Ipot=p.ap**4/12, Iv=p.tw*p.lw**3/12, ratio=p.np*Ipot/(2*Iv), XEV=Fd/2, MEG=Mov/2;
  const eaX=0.05*p.Lx, eaY=0.05*p.Ly, MTX=Fd*eaY, MTY=Fd*eaX, C=2*Iv*(p.Lx/2)**2+2*Iv*(p.Ly/2)**2;
  const FtXX=MTX*Iv*(p.Ly/2)/C, FtYX=MTY*Iv*(p.Ly/2)/C, VEd=XEV+FtXX+0.3*FtYX, maj=(VEd-XEV)/XEV;
  const Ptot=p.G+p.CP+p.psi2*p.Q, theta=Ptot*p.dr/1e3/(Fd*p.h);
  const b=p.tw, dd=p.lw-0.2, fcd=p.fck/1.3, MA=p.MG+p.NG*(dd-p.lw/2), mu=MA/1e3/(b*dd*dd*fcd), al=1.25*(1-Math.sqrt(1-2*mu)), Afs=MA/1e3/(500*dd*(1-0.4*al)), Afc=Afs-p.NG/1e3/500;
  return {p,ME,T1,T2,pc1,pc2,pcs:pc1+pc2,ag,plat,A,H,Ac,Ct,T1ec,Sd,Sdec,lam,Fd,mi,zi,mz,Fi,Mov,zeq,Ipot,Iv,ratio,XEV,MEG,eaX,eaY,MTX,MTY,C,FtXX,FtYX,VEd,maj,Ptot,theta,b,dd,fcd,MA,mu,al,xu:al*dd,Afs,Afc};
}
const C5=calcTD5(TD5P);

/* ---------------- Examen 2021 : bâtiment BA R+3 ---------------- */
const E21P={Gc:[2350,595,101,756,600,150],Gt:[2430,595,101,756,730,150],nc:3,Q:846,psi2:0.3,phi:0.8,Lx:31.6,Ly:15.4,sk:0.95,t:0.18,lw:5.6,nwX:4,ncol:15,acol:0.3,H:12,S:1.5,agR:1.6,gI:1.0,q:2.1,TB:0.06,TC:0.4,TD:2,XG:15.53};
const E21_WALLS_Y=[{id:'T1',l:9.30,x:0,file:'1 (C–E)'},{id:'T2',l:6.10,x:5.6,file:'2 (A–C)'},{id:'T3',l:5.80,x:10.8,file:'3 (C–D)'},{id:'T4',l:5.80,x:13.8,file:'4 (C–D)'},{id:'T5',l:3.50,x:26.0,file:'6 (D–E)'},{id:'T6',l:3.10,x:26.0,file:'6 (A–B)'}];
function calcE21(p){
  const Gn=sum(p.Gc), Gt=sum(p.Gt), G=p.nc*Gn+Gt, Q=p.nc*p.Q, Sn=p.Lx*p.Ly*p.sk*10/10, NE=G+p.phi*p.psi2*Q, ME=NE/9.81;
  const Iw=p.t*p.lw**3/12, Icol=p.acol**4/12, ratio=p.ncol*Icol/(p.nwX*Iw);
  const Ac=p.nwX*p.t*p.lw*(0.2+Math.min(p.lw/p.H,0.9)**2), Ct=0.075/Math.sqrt(Ac), T1=Ct*p.H**0.75;
  const ag=p.gI*p.agR, plat=2.5*p.S*ag/p.q, A=plat*p.TC, Sd0=ag*p.S*2/3, sp={ag,S:p.S,TB:p.TB,TC:p.TC,TD:p.TD,q:p.q}, Sd=sdEC8(T1,sp);
  const lam=(4>=3&&T1<=2*p.TC)?0.85:1, Fd=Sd*ME*lam, Fvoile=Fd/p.nwX, Mren=Fd*p.H/2;
  const IY=E21_WALLS_Y.map(w=>p.t*w.l**3/12), XCT=sum(IY.map((I,i)=>I*E21_WALLS_Y[i].x))/sum(IY), e0x=p.XG-XCT, ea=0.05*p.Lx;
  return {p,Gn,Gt,G,Q,Sn,NE,ME,Iw,Icol,ratio,Ac,Ct,T1,ag,plat,A,Sd0,Sd,lam,Fd,Fvoile,Mren,IY,XCT,e0x,ea,emax:e0x+ea,emin:e0x-ea};
}
const CE21=calcE21(E21P);
/* Annexe Robot (modes propres et efforts modaux) : fournie avec le sujet 2025, page d'annexe titrée « 9 novembre 2021 » ;
   même bâtiment, elle sert aux deux versions du sujet. 40 modes. */
const E21_ROBOT={MtotX:1910637,MtotY:1910636,
 f:[3.2,4.53,8.92,12.65,12.82,13.28,14.31,14.61,15.77,16.0,16.37,16.73,16.85,18.68,20.77,21.04,24.31,24.37,24.51,25.59,25.73,25.77,25.96,26.37,26.92,27.42,27.45,27.49,28.64,29.12,29.27,29.78,30.02,30.28,30.41,30.56,30.58,31.59,31.83,32.61],
 ux:[3.05,73.07,0.61,0.61,0.08,0.01,0.01,0,10.19,7.22,0.02,0.02,0.21,0,0.03,0,0.03,0.02,0.16,0.01,0,0,0.03,0,0.01,0,0,0,2.46,0,0.01,0.73,0.03,0.17,0.09,0,0.02,0.01,0,0],
 uy:[49.9,1.45,20.67,14.85,1.9,0.12,0.02,0,0.11,0.14,0,0.01,0.01,0,0,0,0,0.06,0.65,0.02,0.06,0,0.01,6.26,0.2,0.04,0.01,0.37,0.03,0,0.01,0.09,0.01,0,0,0.02,0.13,0,0,0],
 fx:[-166,-3988,-33,-33,-4.5,-0.34,-0.75,-0.18,-556,-394,-0.94,-0.94,-11.36,0,-1,0,-1,-0.7,-7.7,-0.4,0,0,-1,0,0.36,0,0,0,-109.4,0,0.2,-32,-1.3,-7.53,-3.94,0,0.8,0.45,0,0],
 fy:[-2724,-79,-1128,-810,-104,-6.5,-1,-0.2,-6.2,-7.6,0,0.3,0.3,-0.2,-0.1,-0.2,-0.1,-2.7,-30.3,-1,-2.85,0,0.6,-286.5,-9.1,-1.9,-0.5,-16.5,-1.5,0,0.2,-4,0.6,0,0,1,-5.7,0,0.2,0]};
function calcE21R(c,R){
  const iX=R.ux.indexOf(Math.max(...R.ux)), iY=R.uy.indexOf(Math.max(...R.uy));
  const T=R.f.map(x=>1/x), retX=R.ux.map((v,i)=>v>5?i:-1).filter(i=>i>=0), cumX=sum(retX.map(i=>R.ux[i])), cumX10=sum(R.ux.slice(0,10));
  const sp={ag:c.ag,S:c.p.S,TB:c.p.TB,TC:c.p.TC,TD:c.p.TD,q:c.p.q}, SaX=retX.map(i=>sdEC8(T[i],sp));
  const MmodX=R.ux[iX]/100*R.MtotX/1e3, F1=MmodX*sdEC8(T[iX],sp), Fsrss=srss(...retX.map(i=>R.fx[i]));
  const lam=(T[iX]<=2*c.p.TC)?0.85:1, FdR=sdEC8(T[iX],sp)*R.MtotX/1e3*lam, Fvoile=Fsrss/c.p.nwX, FvoileFd=FdR/c.p.nwX, Mren1=F1*c.p.H/2;
  const dM=(R.MtotX/1e3-c.ME)/c.ME, FY1=Math.abs(R.fy[iY]), MT=FY1*(c.e0x+c.ea), MTmin=FY1*(c.e0x-c.ea);
  const retY=R.uy.map((v,i)=>v>5?i:-1).filter(i=>i>=0), cumY=sum(retY.map(i=>R.uy[i]));
  return {iX,iY,T,retX,cumX,cumX10,SaX,MmodX,F1,Fsrss,lam,FdR,Fvoile,FvoileFd,Mren1,dM,FY1,MT,MTmin,retY,cumY,TX:T[iX],TY:T[iY]};
}
const CE21R=calcE21R(CE21,E21_ROBOT);

/* ---------------- Examen 2022 : bâtiment acier R+5 (sens Y) ---------------- */
const E22P={Lx:30,Ly:18,ep:0.125,rho:2400,bac:10,fp:15,sp:90,fac:80,hEt:3.10,oss:32400,qk:2.5,psi2B:0.3,phi:0.8,
  w:[6.78,19.41,33.55,46.37],Mm:[667100,132000,34225,12000],ms:[349900,346900,313100,312800,312300,78100],z:[3.6,6.7,9.8,12.9,16.0,19.1],
  S:1.2,agR:3.0,gI:1.2,q:4,TB:0.15,TC:0.5,TD:2,withGammaI:true,bay:6,hRdC:3.6,Adiag:91.0,fy:235,rT:17,ls:10.1};
function calcE22(p){
  const A=p.Lx*p.Ly, per=2*(p.Lx+p.Ly), mDalle=A*p.ep*p.rho, mBac=A*p.bac, mFP=A*p.fp, mSP=A*p.sp, mFac=per*p.hEt*p.fac;
  const Gk=mDalle+mBac+mFP+mSP+mFac+p.oss, Qk=p.qk*A, mQ=p.phi*p.psi2B*Qk/9.81*1000, Msis=Gk+mQ;
  const MEt=sum(p.ms), Mhalf=MEt/2, T=p.w.map(w=>2*PI/w), pc=p.Mm.map(m=>m/Mhalf), cum12=pc[0]+pc[1];
  const ag=(p.withGammaI?p.gI:1)*p.agR, sp={ag,S:p.S,TB:p.TB,TC:p.TC,TD:p.TD,q:p.q}, plat=2.5*p.S*ag/p.q, plat2=2.5*p.S*p.agR/p.q, Sd0=ag*p.S*2/3;
  const T1=T[0], Sd=sdEC8(T1,sp), lam=(6>=3&&T1<=2*p.TC)?0.85:1, Fd=Sd*MEt/1e3*lam; // kN
  const mz=p.ms.map((m,i)=>m/1e3*p.z[i]), Fi=mz.map(x=>Fd*x/sum(mz)), Mov=sum(Fi.map((f,i)=>f*p.z[i])), ZE=Mov/2/p.bay;
  const delta=1+0.6*(p.Lx/2)/p.Lx, ZEm=ZE*delta, Vp=Fd/2*delta, Ld=Math.hypot(p.bay,p.hRdC), Nd=Vp*Ld/p.bay, sig=Nd*1e3/(p.Adiag*1e-4)/1e6;
  const sl=Math.max(p.Lx,p.Ly)/Math.min(p.Lx,p.Ly);
  return {p,A,per,mDalle,mBac,mFP,mSP,mFac,Gk,Qk,mQ,Msis,MEt,Mhalf,T,pc,cum12,ag,plat,plat2,Sd0,T1,Sd,lam,Fd,mz,Fi,Mov,ZE,delta,ZEm,Vp,Ld,Nd,sig,sl};
}
const CE22=calcE22(E22P);

/* ---------------- Examen 2024 (TD5-bis) : bâtiment acier R+5 ---------------- */
const E24P={MG:[285.007,281.900,280.661,280.343,279.839,78.077],Q:1350,psi2:[0.6,0.6,0.3,0.3,0.3,0],phi:0.8,
  w:[5.83,18.19,35.29,56.04],Mm:[689.358,112.023,34.225,12.0],Mgiven:1713,S:1.2,agR:3.0,gI:1.2,qX:5.2,qY:4.0,TB:0.15,TC:0.5,TD:2,Lx:30,Ly:18,xC:12,
  RX:{m1:[[-93.83,-216.97,-278.74],[-119.05,-5.03,-310.04]],m2:[[-34.36,22.46,-86.66],[-41.06,-0.63,-95.05]],sumFX1:[-93.83,-119.05,-119.04,-119.04,-119.05,-93.83],sumFX2:[-34.36,-41.06,-40.95,-40.95,-41.06,-34.36]},
  RY:{m1:[0,-972.67,-2052.47,0],m2:[0,-383.5,-6.62,0]}, EG:[7.36,0,-308.8,-9.43], EQC:[-3.8,0,-45.1,-3.8], EQB:[0.09,0,-69.2,-0.12]};
function calcE24(p){
  const psiE=p.psi2.map(x=>x*p.phi), mQ=psiE.map(x=>x*p.Q/9.81), Ms=p.MG.map((m,i)=>m+mQ[i]), Mtot=sum(Ms), Mh=Mtot/2;
  const T=p.w.map(w=>2*PI/w), pc=p.Mm.map(m=>m/Mh), cum12=pc[0]+pc[1];
  const ag=p.gI*p.agR, platX=2.5*p.S*ag/p.qX, platY=2.5*p.S*ag/p.qY, A=platX*p.TC, sp={ag,S:p.S,TB:p.TB,TC:p.TC,TD:p.TD,q:p.qX};
  const Sa=T.map(t=>sdEC8(t,sp)), Fmod=p.Mm.map((m,i)=>m*Sa[i]), FX1=sum(p.RX.sumFX1), FX2=sum(p.RX.sumFX2);
  const N1=[0,1,2].map(k=>srss(p.RX.m1[0][k],p.RX.m2[0][k])), N29=[0,1,2].map(k=>srss(p.RX.m1[1][k],p.RX.m2[1][k]));
  const ESX=[N1[0],0,N1[1],N1[2]], ESY=[0,1,2,3].map(k=>srss(p.RY.m1[k],p.RY.m2[k]));
  const NW=[ESX.map((x,k)=>x+0.3*ESY[k]),ESX.map((x,k)=>-(x+0.3*ESY[k])),ESY.map((y,k)=>y+0.3*ESX[k]),ESY.map((y,k)=>-(y+0.3*ESX[k]))];
  const Etot=NW.map(n=>n.map((x,k)=>p.EG[k]+x+0.6*p.EQC[k]+0.3*p.EQB[k]));
  const xG=p.Lx/2, yG=p.Ly/2, yC=p.Ly/2, e0x=xG-p.xC, e0y=yG-yC, eaX=0.05*p.Lx, eaY=0.05*p.Ly, ex=e0x+eaX, ey=e0y+eaY;
  const FEX=srss(2*Math.abs(FX1),2*Math.abs(FX2)), FEY=srss(2*Math.abs(p.RY.m1[1]),2*Math.abs(p.RY.m2[1])), MEX=FEX*ey, MEY=FEY*ex;
  return {p,psiE,mQ,Ms,Mtot,Mh,T,pc,cum12,ag,platX,platY,A,Sa,Fmod,FX1,FX2,N1,N29,ESX,ESY,NW,Etot,xG,yG,e0x,e0y,eaX,eaY,ex,ey,FEX,FEY,MEX,MEY};
}
const CE24=calcE24(E24P);
const E24_OFF={Msis:1716,Fz_NW1:825,Fz_tot:468};
