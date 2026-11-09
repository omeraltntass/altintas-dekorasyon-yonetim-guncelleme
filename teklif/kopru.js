// Teklif programı ile Altıntaş Dekorasyon Yönetim arasındaki köprü.
// Teklif programı veriyi "db" arayüzüyle okur ve yazar; bu dosya istekleri ana programa iletir,
// ana program da oturumdaki kullanıcıyla buluta yazar (yetki ve işlem kaydı sunucuda).
(function () {
  var KANAL = 'altintas-teklif'
  var bekleyen = {}
  var sayac = 0
  window.addEventListener('message', function (e) {
    if (e.source !== window.parent) return
    var m = e.data
    if (!m || m.kanal !== KANAL || !bekleyen[m.id]) return
    var p = bekleyen[m.id]
    delete bekleyen[m.id]
    if (m.ok) p.resolve(m.data)
    else p.reject(Object.assign(new Error(m.error || 'İşlem yapılamadı'), { code: m.code }))
  })
  function istek(op, args) {
    return new Promise(function (resolve, reject) {
      var id = ++sayac
      bekleyen[id] = { resolve: resolve, reject: reject }
      window.parent.postMessage({ kanal: KANAL, id: id, op: op, args: args }, '*')
    })
  }
  var db = {
    collection: function (col) {
      return {
        get: function () {
          return istek('list', { col: col }).then(function (rows) {
            return { docs: rows.map(function (r) { return { id: r.id, data: function () { return r.veri } } }) }
          })
        },
        doc: function (id) {
          return {
            set: function (body) { return istek('set', { col: col, id: id, veri: body }) },
            delete: function () { return istek('delete', { col: col, id: id }) }
          }
        }
      }
    }
  }
  var downloads = {
    save: function (o) {
      var data = o.data
      var blob = data instanceof Blob ? data
        : typeof data === 'string' && data.indexOf('data:') === 0 ? dataUrlToBlob(data)
        : new Blob([data])
      var a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = o.filename || 'dosya'
      document.body.appendChild(a)
      a.click()
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove() }, 5000)
      istek('event', { action: 'teklif.indir', summary: 'Teklif programından dosya indirildi: ' + (o.filename || '') }).catch(function () {})
      return Promise.resolve()
    }
  }
  function dataUrlToBlob(u) {
    var parts = u.split(',')
    var mime = (parts[0].match(/data:([^;]+)/) || [])[1] || 'application/octet-stream'
    var bin = parts[0].indexOf('base64') >= 0 ? atob(parts[1]) : decodeURIComponent(parts[1])
    var arr = new Uint8Array(bin.length)
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    return new Blob([arr], { type: mime })
  }
  window.claude = {
    use: function (name) {
      return Promise.resolve(name === 'db' ? db : name === 'downloads' ? downloads : null)
    }
  }
})()
