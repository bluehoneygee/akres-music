const SOURCE_RESULTS_IMAGES: string[] = [
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902109/Congratulations_Kami_mengucapkan_selamat_dan_rasa_bangga_yang_besar_kepada_Zefanya_Manurung_1_db2g7d.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902109/Congratulations_Kami_bangga_mengucapkan_selamat_kepada_Davina_Embun_Wimala_atas_pencapaianny_jgckji.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902109/Congratulations_Kami_mengucapkan_selamat_dan_rasa_bangga_yang_besar_kepada_Zefanya_Manurung_2_tqyl14.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902110/Congratulations_to_our_amazing_students_Bangga_melihat_setiap_proses_latihan_dan_usaha_y_1_jxkbrp.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902109/Congratulations_Kami_mengucapkan_selamat_dan_rasa_bangga_yang_besar_kepada_Zefanya_Manurung_as1bof.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902110/Congratulations_to_our_amazing_students_Bangga_melihat_setiap_proses_latihan_dan_usaha_y_3_fxtecd.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902110/Congratulations_to_our_amazing_students_Bangga_melihat_setiap_proses_latihan_dan_usaha_y_2_flsdub.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902110/Congratulations_to_our_amazing_students_Bangga_melihat_setiap_proses_latihan_dan_usaha_y_kfdtz7.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902110/Selamat_untuk_Davina_Embun_Wimala_Juara_3_Solo_Song_Kategori_SD_pada_Event_Lampung_Student_O_mrzegr.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902110/Selamat_untuk_Mawa_Tamar_Aruni_Juara_Harapan_2_Solo_Song_Best_Performance_pada_Event_Hari_cefgcr.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902110/Selamat_untuk_Savira_Putri_Kirana_Juara_Harapan_3_Solo_Song_Kategori_SD_pada_Event_Lampung_S_eae5zd.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902110/Congratulations_to_our_young_stars_Bangga_melihat_perjuangan_dan_keberanian_anak-anak_tamp_sr25ss.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779903000/Congratulation_to_our_student_-_Davina_Embun_Wimala_Special_thanks_to_Ms._Octa_octaviapermts_yxfxed.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779903000/Mawa_Tamar_Aruni_Juara_3_Solo_SongSenang_sekali_melihat_kepercayaan_diri_dan_kemampuan_Mawa_te_qpfues.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779903000/Davina_Embun_Wimala_Gold_Medal_selalu_tampil_maksimal_Terus_berkarya_dan_menginspirasi_yang_l_ps8skk.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902999/Congratulations_Aryasatya_Diandra_NuraniWe_are_proud_to_celebrate_your_achievement_as_the_cnzpcx.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902999/Congratulations_Muhammad_Ghoisan_Al-Fatih_We_are_proud_to_celebrate_your_achievement_as_th_nxwoaa.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902999/Congratulations_Luthfi_Genta_GumilangWe_are_proud_to_celebrate_your_achievement_as_the_Gol_mqg0be.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902999/Bangga_banget_sama_Zefanya_Tetap_semangat_berkembang_ya_talentanya_luar_biasa_Huge_congratu_wzzqxe.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902998/CONGRATULATIONS_Proud_moment_for_Akres_Music_Academy_Selamat_kepada_murid-murid_terbaik_k_zjljlh.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902999/CONGRATULATIONS_Proud_moment_for_Akres_Music_Academy_Selamat_kepada_Mawa_Tamar_Aruni_J_h60odd.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902998/CONGRATULATIONS_Proud_moment_for_Akres_Music_Academy_Selamat_kepada_murid-murid_kami_atas_vdjfub.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902998/CONGRATULATIONS_Another_proud_achievement_from_Akres_Music_Academy_Selamat_kepada_murid-_dod5oy.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902998/Selamat_untuk_Vania_Alona_Larasati_1st_Runner_Up_Puteri_Anak_Indonesia_Lampung_2025_Akr_yexswr.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779902997/Selamat_untuk_Davina_Embun_Wimala_yang_berhasil_meraih_Juara_3_Lomba_Solo_Song_dalam_acara_Geb_yeiodk.jpg",
];

export const RESULTS_IMAGES: string[] = Array.from({ length: 32 }, (_, index) => {
  return SOURCE_RESULTS_IMAGES[index % SOURCE_RESULTS_IMAGES.length];
});
