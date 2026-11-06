"use client";
import { chapters, inChapter, type ChapterId } from '@/lib/catalog';
import type { Album, Photo } from '@/lib/types';
export default function ChapterIndex({albums,photos,assetBase,onChapter,onAll}:{albums:Album[];photos:Photo[];assetBase:string;onChapter:(chapter:ChapterId)=>void;onAll:()=>void}) {
  return <section className="chapter-index">
    <div className="chapter-index-heading">
      <h1>Three ways<br/>of <em>seeing.</em></h1>
      <div><button onClick={onAll}>All collections <span>↗</span></button></div>
    </div>
    <div className="chapter-portals">{chapters.map((chapter,i)=>{
      const assigned=albums.filter(a=>inChapter(a,chapter.id));
      const first=assigned.find(a=>a.photoIds.length);
      const cover=first&&photos.find(p=>p.id===(first.coverId||first.photoIds[0]));
      return <button className={`chapter-portal portal-${chapter.id}`} key={chapter.id} onClick={()=>onChapter(chapter.id)}>
        <div className="chapter-art" aria-hidden="true">
          {chapter.id==='scenes'?<div className="chapter-earth" style={{backgroundImage:`url(${assetBase}atlas/earth-card.webp)`}}/>:cover?<img src={cover.thumb} alt=""/>:<div className={`chapter-study study-${chapter.id}`}><i/><i/><i/></div>}
        </div>
        <div className="chapter-portal-top"><span>0{i+1}</span><span>{chapter.id==='scenes'?'EXPLORE THE ATLAS':`${assigned.length.toString().padStart(2,'0')} COLLECTIONS`}</span></div>
        <div className="chapter-portal-copy">
          <h2>{chapter.title}</h2>
          <span className="chapter-arrow" aria-hidden="true">↗</span>
        </div>
      </button>;
    })}</div>
  </section>;
}
