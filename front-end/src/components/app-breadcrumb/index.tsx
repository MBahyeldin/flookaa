import { useLocation } from "react-router-dom";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { ChevronRight } from "lucide-react";
import clsx from "clsx";

export default function AppBreadcrumb() {
  const { pathname } = useLocation();
  if (pathname === "/" || pathname.slice(1).split("/").length < 2) {
    return null;
  }
  const parts: BreadcrumbItemDetails[] = pathname
    .slice(1)
    .split("/")
    .map((segment, index, arr) => {
      const isLast = index === arr.length - 1;
      return {
        label: segment,
        addSeparator: !isLast,
      };
    });
  return (
    <Breadcrumb className="w-full px-4 py-3" aria-label="Breadcrumb">
      <BreadcrumbList>
        {parts.map((item, index) => (
          <BreadcrumbItem key={`item-${index}`}>
            <BreadcrumbPage
              className={clsx({
                "font-light": item.addSeparator,
                "font-medium": !item.addSeparator,
              })}
            >
              {item.label}
            </BreadcrumbPage>
            {item.addSeparator && (
              <ChevronRight
                key={`separator-${index}`}
                className="size-4 mt-1"
              />
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

type BreadcrumbItemDetails = {
  label: string;
  addSeparator?: boolean;
};
