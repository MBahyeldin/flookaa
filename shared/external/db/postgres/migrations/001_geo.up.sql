
CREATE TABLE IF NOT EXISTS public.cities (
    id bigint NOT NULL PRIMARY KEY,
    name character varying(255) NOT NULL,
    state_id bigint NOT NULL,
    state_code character varying(255) NOT NULL,
    country_id bigint NOT NULL,
    country_code character(2) NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    timezone character varying(255),
    created_at timestamp without time zone DEFAULT '2014-01-01 12:01:01'::timestamp without time zone NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    flag smallint DEFAULT 1 NOT NULL,
    "wikiDataId" character varying(255)
);


CREATE TABLE IF NOT EXISTS public.countries (
    id bigint NOT NULL PRIMARY KEY,
    name character varying(100) NOT NULL,
    iso3 character(3),
    numeric_code character(3),
    iso2 character(2),
    phonecode character varying(255),
    capital character varying(255),
    currency character varying(255),
    currency_name character varying(255),
    currency_symbol character varying(255),
    tld character varying(255),
    native character varying(255),
    region character varying(255),
    region_id bigint,
    subregion character varying(255),
    subregion_id bigint,
    nationality character varying(255),
    timezones text,
    translations text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    emoji character varying(191),
    "emojiU" character varying(191),
    created_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    flag smallint DEFAULT 1 NOT NULL,
    "wikiDataId" character varying(255)
);


--
-- Name: regions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.regions (
    id bigint NOT NULL PRIMARY KEY,
    name character varying(100) NOT NULL,
    translations text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    flag smallint DEFAULT 1 NOT NULL,
    "wikiDataId" character varying(255)
);



--
-- Name: states; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.states (
    id bigint NOT NULL PRIMARY KEY,
    name character varying(255) NOT NULL,
    country_id bigint NOT NULL,
    country_code character(2) NOT NULL,
    fips_code character varying(255),
    iso2 character varying(255),
    iso3166_2 character varying(10),
    type character varying(191),
    level integer,
    parent_id bigint,
    native character varying(255),
    latitude numeric(10,8),
    longitude numeric(11,8),
    timezone character varying(255),
    created_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    flag smallint DEFAULT 1 NOT NULL,
    "wikiDataId" character varying(255)
);



--
-- Name: subregions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS  public.subregions (
    id bigint NOT NULL PRIMARY KEY,
    name character varying(100) NOT NULL,
    translations text,
    region_id bigint NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    flag smallint DEFAULT 1 NOT NULL,
    "wikiDataId" character varying(255)
);
