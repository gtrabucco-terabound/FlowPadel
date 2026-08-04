-- Nuevo tipo de evento "Cancha abierta" (juego libre: inscripción + cobro, sin
-- fixture ni ranking) y responsable a cargo (un profe del club).
alter type tournament_format add value if not exists 'cancha_abierta';
