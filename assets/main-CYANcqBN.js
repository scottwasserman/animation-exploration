import"./modulepreload-polyfill-B5Qt9EMX.js";const i=[{id:"flow-field",title:"Neural Activity",description:"Mouse-reactive neural noise field. Move to warp, click to pulse.",path:"/animation-exploration/animations/flow-field/",tags:["shader","interactive"]},{id:"face-it-1",title:"Face It 1",description:"Outside me. Drag to rotate, shift+drag to move, scroll to zoom.",path:"/animation-exploration/animations/face-it-1/",tags:["shader","interactive"]},{id:"wave-horizon",title:"Consciousness 1",description:"A look at my typical brain activity. White peaks are breaking through to the foreground of thought.",path:"/animation-exploration/animations/wave-horizon/",tags:["3d","shader","interactive"]}],e=document.getElementById("grid");e.innerHTML=i.map(t=>`
    <a class="card" href="${t.path}">
      <div class="card-header">
        <h2>${t.title}</h2>
        <span class="card-arrow" aria-hidden="true">→</span>
      </div>
      <p>${t.description}</p>
      <div class="tags">
        ${t.tags.map(a=>`<span class="tag">${a}</span>`).join("")}
      </div>
    </a>
  `).join("");
