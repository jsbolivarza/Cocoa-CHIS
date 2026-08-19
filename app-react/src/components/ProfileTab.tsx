/* ProfileTab.tsx
   Ported from renderProfileTab() in docs/js/app.js. */

import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";
import { calcProfile } from "../lib/calc";
import { TextField, NumberField, SelectField } from "./fields";
import { KpiCard, StatBox } from "./Kpi";
import { DataTable } from "./DataTable";

export function ProfileTab() {
  const record = useAppStore((s) => s.record);
  const lang = useAppStore((s) => s.currentLang);
  if (!record) return null;
  const p = record.profile;
  const res = calcProfile(p);
  const area = record.meta.areaUnit;

  return (
    <div className="panel">
      <h3>{t("profile_ims_heading", lang)}</h3>
      <p className="section-help">{t("profile_ims_help", lang)}</p>
      <div className="form-grid form-grid-3">
        <label>
          {t("coop_name", lang)}
          <TextField path="profile.coopName" value={p.coopName} />
        </label>
        <label>
          {t("flo_id", lang)}
          <TextField path="profile.floId" value={p.floId} />
        </label>
        <label>
          {t("coach_name", lang)}
          <TextField path="profile.coachName" value={p.coachName} />
        </label>
        <label className="optional">
          {t("programme", lang)}
          <TextField path="profile.programme" value={p.programme} />
          <span className="field-hint">{t("programme_help", lang)}</span>
        </label>
        <label>
          {t("producer_name", lang)}
          <TextField path="profile.producerName" value={p.producerName} />
        </label>
        <label>
          {t("producer_code", lang)}
          <TextField path="profile.producerCode" value={p.producerCode} />
          <span className="field-hint">{t("producer_code_help", lang)}</span>
        </label>
        <label className="optional">
          {t("village", lang)}
          <TextField path="profile.village" value={p.village} />
        </label>
        <label className="optional">
          {t("gps", lang)}
          <TextField path="profile.gps" value={p.gps} />
        </label>
      </div>

      <div className="form-grid form-grid-3">
        <label>
          {t("area_unit", lang)}
          <SelectField path="meta.areaUnit" value={record.meta.areaUnit} lang={lang} optionsKey="area_units" />
        </label>
        <label>
          {t("volume_unit", lang)}
          <TextField path="meta.volumeUnit" value={record.meta.volumeUnit} />
        </label>
        <label>
          {t("currency_unit", lang)}
          <TextField path="meta.currencyUnit" value={record.meta.currencyUnit} />
          <span className="field-hint">{t("unit_hint", lang)}</span>
        </label>
      </div>

      <div className="form-grid form-grid-3">
        <label>
          {t("cocoa_area_ims", lang)}
          <NumberField path="profile.cocoaAreaIms" value={p.cocoaAreaIms} />
        </label>
        <label>
          {t("measured_or_estimated", lang)}
          <SelectField path="profile.cocoaAreaImsMeasured" value={p.cocoaAreaImsMeasured} lang={lang} staticOptions={["measured", "estimated"]} />
        </label>
        <label>
          {t("cocoa_volume_produced", lang)}
          <NumberField path="profile.cocoaVolumeProduced" value={p.cocoaVolumeProduced} />
        </label>
        <label>
          {t("total_farm_area_ims", lang)}
          <NumberField path="profile.totalFarmAreaIms" value={p.totalFarmAreaIms} />
        </label>
        <label>
          {t("measured_or_estimated", lang)}
          <SelectField path="profile.totalFarmAreaImsMeasured" value={p.totalFarmAreaImsMeasured} lang={lang} staticOptions={["measured", "estimated"]} />
        </label>
        <label>
          {t("cocoa_volume_sold_coop", lang)}
          <NumberField path="profile.cocoaVolumeSoldCoop" value={p.cocoaVolumeSoldCoop} />
        </label>
        <label>
          {t("farmgate_price_main", lang)}
          <NumberField path="profile.farmgatePriceMain" value={p.farmgatePriceMain} />
        </label>
        <label className="optional">
          {t("fp_distributed", lang)}
          <NumberField path="profile.fpDistributed" value={p.fpDistributed} />
        </label>
        <label className="optional">
          {t("farmgate_price_mid", lang)}
          <NumberField path="profile.farmgatePriceMid" value={p.farmgatePriceMid} />
        </label>
        <label className="optional">
          {t("other_diff_distributed", lang)}
          <NumberField path="profile.otherDiffDistributed" value={p.otherDiffDistributed} />
        </label>
      </div>

      <h3>{t("farm_distribution_heading", lang)}</h3>
      <p className="section-help">{t("farm_distribution_help", lang)}</p>
      <div className="kpi-grid">
        <KpiCard accent="night" labelKey="total_cocoa_area" value={res.totalCocoaArea} lang={lang} unit={area} />
        <KpiCard accent="eggplant" labelKey="total_cult_area" value={res.totalCultArea} lang={lang} unit={area} />
        <KpiCard accent="mint" labelKey="total_farm_area_farmer" value={res.totalFarmAreaFarmer} lang={lang} unit={area} />
      </div>
      <div className="stat-row">
        <StatBox labelKey="total_cocoa_only_area" value={res.cocoaOnly} lang={lang} unit={area} />
        <StatBox labelKey="total_intercropped_cocoa_area" value={res.cocoaIntercropped} lang={lang} unit={area} />
        <StatBox labelKey="cocoa_area_sharecropped" value={res.cocoaAreaSharecropped} lang={lang} unit={area} />
        <StatBox labelKey="pct_cocoa_sharecropped" value={res.pctCocoaSharecropped * 100} lang={lang} unit="%" />
        <StatBox labelKey="farm_sharecropped" value={res.farmSharecropped} lang={lang} unit={area} />
        <StatBox labelKey="pct_farm_sharecropped" value={res.pctFarmSharecropped * 100} lang={lang} unit="%" />
      </div>
      <DataTable schemaKey="plots" arrPath="profile.plots" />

      <div className="form-grid form-grid-3">
        <label className="optional">
          {t("fallow_land", lang)}
          <NumberField path="profile.fallowLand" value={p.fallowLand} />
        </label>
        <label className="optional">
          {t("minor_food_crops", lang)}
          <TextField path="profile.minorFoodCrops" value={p.minorFoodCrops} />
        </label>
        <label className="optional">
          {t("livestock_kept", lang)}
          <TextField path="profile.livestockKept" value={p.livestockKept} />
        </label>
      </div>

      <h3>{t("hh_composition_heading", lang)}</h3>
      <div className="stat-row">
        <StatBox labelKey="hh_total_members" value={res.totalMembers} lang={lang} />
        <StatBox labelKey="hh_working_age" value={res.workingAge} lang={lang} />
        <StatBox labelKey="hh_working_count" value={res.workingCount} lang={lang} />
        <StatBox labelKey="hh_working_fte" value={res.fte} lang={lang} />
      </div>
      <p className="field-hint">{t("working_age_hint", lang)}</p>

      <h4>{t("hh_working_heading", lang)}</h4>
      <p className="section-help">{t("hh_working_help", lang)}</p>
      <DataTable schemaKey="householdWorking" arrPath="profile.householdWorking" />

      <h4>{t("hh_not_working_heading", lang)}</h4>
      <DataTable schemaKey="householdNotWorking" arrPath="profile.householdNotWorking" />
    </div>
  );
}
