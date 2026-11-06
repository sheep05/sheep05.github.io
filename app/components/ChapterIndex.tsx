"use client";
import { observeScrollReveal } from "@/lib/scroll-reveal";
import { chapters, inChapter, type ChapterId } from '@/lib/catalog';
import type { Album, Photo } from '@/lib/types';
export default function ChapterIndex({live,albums,photos,assetBase,onChapter,onAll}:{live:boolean;albums:Album[];photos:Photo[];assetBase:string;onChapter:(chapter:ChapterId)=>void;onAll:()=>void}) {
  return <section className="chapter-index">
    <div className="chapter-index-heading">
      <h1 ref={live ? observeScrollReveal : undefined}>Three ways<br/>of <em>seeing.</em></h1>
      <div><button ref={live ? observeScrollReveal : undefined} onClick={onAll}>All collections <span>↗</span></button></div>
    </div>
    <div className="chapter-portals">{chapters.map((chapter,i)=>{
      const assigned=albums.filter(a=>inChapter(a,chapter.id));
      const first=assigned.find(a=>a.photoIds.length);
      const cover=first&&photos.find(p=>p.id===(first.coverId||first.photoIds[0]));
      return <a
        className={`chapter-portal portal-${chapter.id}`}
        key={chapter.id}
        href={`?view=${chapter.id}`}
        ref={live ? observeScrollReveal : undefined}
        onClick={event => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          onChapter(chapter.id);
        }}
      >
        <div className="chapter-art" aria-hidden="true">
          {chapter.id==='scenes'?<div className="chapter-earth" style={{backgroundImage:`url(${assetBase}atlas/earth-card.webp)`}}/>:cover?<img src={cover.thumb} alt=""/>:<div className={`chapter-study study-${chapter.id}`}><i/><i/><i/></div>}
        </div>
        <div className="chapter-portal-top"><span>0{i+1}</span><span>{chapter.id==='scenes'?'EXPLORE THE ATLAS':`${assigned.length.toString().padStart(2,'0')} COLLECTIONS`}</span></div>
        <div className="chapter-portal-copy">
          <h2>{chapter.title}</h2>
          <span className="chapter-arrow" aria-hidden="true">↗</span>
        </div>
      </a>;
    })}</div>
  </section>;
}
