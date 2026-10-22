export const UsoDatos = () => (
  <div className="user-mgmt-panel">
    <div className="user-mgmt-header">
      <span style={{ fontWeight: 600 }}>Uso de datos personales</span>
    </div>
    <div className="texto-datos">
      <p>
        Esta herramienta es de uso interno del personal de CEIJA N° 12, sede Las Higueras.
        No reemplaza al Libro Matriz ni al Sistema de Gestión Educativa (SGE): esos siguen siendo los registros oficiales.
      </p>
      <p>
        Se guardan solo los datos que pide el legajo (Ley 25.326): identidad, contacto, documentación y trayectoria.
        No se suben fotos del DNI ni archivos. Los documentos siguen en Drive y acá se guarda el enlace.
      </p>
      <p>
        El DNI completo, la fecha de nacimiento, el contacto y la documentación los ve solamente un administrador.
        Docentes y lectura ven el nombre y el DNI enmascarado. Una cuenta nueva queda pendiente hasta que un administrador la habilita.
      </p>
      <p>
        Las exportaciones a Excel pueden incluir datos sensibles. Descargalas solo si las vas a guardar en el Drive de la sede y no las reenvíes.
      </p>
    </div>
  </div>
);
