import { useState } from 'react'
import { ChevronDown, MapPin, ExternalLink, ShoppingBag } from 'lucide-react'
import { openPage, tryOpenXiaohongshu, buildDianpingSearchUrl, getMobileXiaohongshuLink } from '../services/meituanHub'
import type { PlanDetails } from '../types'

interface Props {
  details: PlanDetails;
  city?: string;
}

export default function PlanDetailsPanel({ details, city = '南京' }: Props) {
  const [expanded, setExpanded] = useState(true)

  const hasContent =
    details.overview ||
    details.lunch ||
    details.dinner ||
    (details.snacks && details.snacks.length > 0) ||
    (details.route && details.route.length > 0) ||
    (details.tips && details.tips.length > 0)

  if (!hasContent) return null

  return (
    <div className="border border-neutral-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-3 hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">行程详情</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-4 animate-fade-in border-t border-neutral-100">
          {/* Overview */}
          {details.overview && (
            <div className="p-3 border border-neutral-200">
              <p className="text-sm text-neutral-600 leading-relaxed">{details.overview}</p>
            </div>
          )}

          {/* Lunch */}
          {details.lunch && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-neutral-400">午餐推荐</p>
              <DetailCard
                name={details.lunch.name}
                description={details.lunch.description}
                location={details.lunch.location}
                price={details.lunch.price}
                city={city}
              />
            </div>
          )}

          {/* Dinner */}
          {details.dinner && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-neutral-400">晚餐推荐</p>
              <DetailCard
                name={details.dinner.name}
                description={details.dinner.description}
                location={details.dinner.location}
                price={details.dinner.price}
                city={city}
              />
            </div>
          )}

          {/* Snacks - 必吃小吃，加团购按钮 */}
          {details.snacks && details.snacks.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-neutral-400">必吃小吃</p>
              <div className="space-y-2">
                {details.snacks.map((snack, idx) => (
                  <DetailCard
                    key={idx}
                    name={snack.name}
                    description={snack.description}
                    location={snack.location}
                    price={snack.price}
                    city={city}
                    showTuanGou={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Route */}
          {details.route && details.route.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-neutral-400">游览路线</p>
              <div className="space-y-2">
                {details.route.map((step) => (
                  <div
                    key={step.step}
                    className="flex gap-3 p-3 border border-neutral-200"
                  >
                    <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center border border-neutral-300">
                      <span className="text-[10px] font-medium text-neutral-500">{step.step}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm text-neutral-800">{step.spot}</h5>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-neutral-400">{step.duration}</span>
                      </div>
                      {step.note && (
                        <p className="text-xs text-neutral-400 mt-1">{step.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {details.tips && details.tips.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-neutral-400">实用贴士</p>
              <div className="space-y-1.5">
                {details.tips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="flex gap-2 p-2.5 border border-neutral-200"
                  >
                    <span className="text-xs text-neutral-400 flex-shrink-0">·</span>
                    <p className="text-xs text-neutral-600 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DetailCard({
  name,
  description,
  location,
  price,
  city = '南京',
  showTuanGou = false,
}: {
  name: string;
  description?: string;
  location?: string;
  price?: number;
  city?: string;
  showTuanGou?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 p-3 border border-neutral-200">
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <h5 className="text-sm font-medium text-neutral-800">{name}</h5>
          {description && (
            <p className="text-xs text-neutral-400 mt-0.5">{description}</p>
          )}
          {location && (
            <a
              href={`https://uri.amap.com/search?keyword=${encodeURIComponent(name + ' ' + location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1 hover:text-neutral-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <MapPin size={9} />
              <span className="truncate">{location}</span>
            </a>
          )}
        </div>
        {price && price > 0 && (
          <span className="flex-shrink-0 text-xs text-neutral-500">
            ¥{price}
          </span>
        )}
      </div>

      {/* 团购搜索按钮（小吃专用） */}
      {showTuanGou && (
        <div className="flex items-center gap-2 pt-1.5 border-t border-neutral-100">
          <button
            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-[#FF6633] text-white font-medium hover:bg-[#E55A2B] transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              const h5Url = buildDianpingSearchUrl(name, city)
              openPage(h5Url)
            }}
          >
            <ShoppingBag size={10} />
            搜点评
            <ExternalLink size={9} />
          </button>
          <button
            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-[#FF2442] text-white font-medium hover:bg-[#e0203b] transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              const { appScheme, h5Url } = getMobileXiaohongshuLink(name)
              tryOpenXiaohongshu(appScheme, h5Url)
            }}
          >
            小红书
            <ExternalLink size={9} />
          </button>
        </div>
      )}
    </div>
  )
}
