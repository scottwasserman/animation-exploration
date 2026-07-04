import"./modulepreload-polyfill-B5Qt9EMX.js";const a=[{id:"flow-field",title:"Neural Activity",description:"Mouse-reactive neural noise field. Move to warp, click to pulse.",path:"/animation-exploration/animations/flow-field/",tags:["shader","interactive"]},{id:"face-it-1",title:"Face It 1",description:"Outside me. Drag to rotate, shift+drag to move, scroll to zoom.",path:"/animation-exploration/animations/face-it-1/",tags:["shader","interactive"]},{id:"wave-horizon",title:"Consciousness 1",description:"A look at my typical brain activity. White peaks are breaking through to the foreground of thought.",path:"/animation-exploration/animations/wave-horizon/",tags:["3d","shader","interactive"]},{id:"wave-horizon-2",title:"Consciousness 2",description:"A look at my typical brain activity. White peaks are breaking through to the foreground of thought.",path:"/animation-exploration/animations/wave-horizon-2/",tags:["3d","shader","interactive"]},{id:"leave-a-message",title:"Leave A Message",description:"",path:"/animation-exploration/animations/leave-a-message/",tags:["3d","audio","interactive"]},{id:"connections-1",title:"Connections 1",description:"A 3D grid of 1000 neurons, randomly linking and unlinking as the lattice spins.",path:"/animation-exploration/animations/connections-1/",tags:["3d","interactive"]},{id:"connections-2",title:"Connections 2",description:"A 3D grid of 1000 neurons, randomly linking and unlinking as the lattice spins.",path:"/animation-exploration/animations/connections-2/",tags:["3d","interactive"]},{id:"model-loader",title:"Model Loader",description:"Load and inspect GLB, glTF, or OBJ models. Drag to rotate, shift+drag to move, scroll to zoom.",path:"/animation-exploration/animations/model-loader/",tags:["3d","interactive"]}],e=document.getElementById("grid");e.innerHTML=a.map(i=>`
    <a class="card" href="${i.path}">
      <div class="card-header">
        <h2>${i.title}</h2>
        <span class="card-arrow" aria-hidden="true">→</span>
      </div>
      <p>${i.description}</p>
      <div class="tags">
        ${i.tags.map(t=>`<span class="tag">${t}</span>`).join("")}
      </div>
    </a>
  `).join("");
