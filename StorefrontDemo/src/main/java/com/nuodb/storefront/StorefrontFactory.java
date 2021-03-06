/* Copyright (c) 2013 NuoDB, Inc. */

package com.nuodb.storefront;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.hibernate.cfg.Environment;
import org.hibernate.tool.hbm2ddl.SchemaExport;

import com.nuodb.storefront.dal.IStorefrontDao;
import com.nuodb.storefront.dal.StorefrontDao;
import com.nuodb.storefront.model.DbConnInfo;
import com.nuodb.storefront.service.IDataGeneratorService;
import com.nuodb.storefront.service.ISimulatorService;
import com.nuodb.storefront.service.IStorefrontService;
import com.nuodb.storefront.service.datagen.DataGeneratorService;
import com.nuodb.storefront.service.simulator.SimulatorService;
import com.nuodb.storefront.service.storefront.StorefrontService;

/**
 * Factory for creating Storefront services and schema managers. To keep code in
 * this demo straightforward, this factory is used in lieu of dependency
 * injection, e.g. via the Spring framework.
 */
public class StorefrontFactory {
    private static final Configuration s_configuration;
    private static volatile SessionFactory s_sessionFactory;
    private static volatile ISimulatorService s_simulator;

    static {
        s_configuration = new Configuration();
        s_configuration.configure();
        
        String dbName = System.getProperty("storefront.db.name");
        String dbUser = System.getProperty("storefront.db.user");
        String dbPassword = System.getProperty("storefront.db.password");
        
        if (dbName != null) {
            Matcher dbNameMatcher = Pattern.compile("([^@]*)@([^@:]*(?::\\d+|$))").matcher(dbName);
            if (!dbNameMatcher.matches()) {
                throw new IllegalArgumentException("Database name must be of the format name@host[:port]");
            }
            String name = dbNameMatcher.group(1);
            String host = dbNameMatcher.group(2);            
            
            String url = "jdbc:com.nuodb://" + host + "/" + name;
            
            s_configuration.setProperty(Environment.URL, url);
        }
        if (dbUser != null) {
            s_configuration.setProperty(Environment.USER, dbUser);
        }
        if (dbPassword != null) {
            s_configuration.setProperty(Environment.PASS, dbPassword);
        }
    }

    private StorefrontFactory() {
    }
    
    public static DbConnInfo getDbConnInfo() {
        DbConnInfo info = new DbConnInfo();
        info.setUrl(s_configuration.getProperty(Environment.URL));
        info.setUsername(s_configuration.getProperty(Environment.USER));
        return info;
    }

    public static SchemaExport createSchemaExport() {
        return new SchemaExport(s_configuration);
    }

    public static IStorefrontService createStorefrontService() {
        return new StorefrontService(createStorefrontDao());
    }

    public static IDataGeneratorService createDataGeneratorService() {
        return new DataGeneratorService(getOrCreateSessionFactory().openStatelessSession());
    }
    
    public static ISimulatorService getSimulatorService() {
        if (s_simulator == null) {
            synchronized (s_configuration) {
                s_simulator = new SimulatorService(createStorefrontService());
            }
        }
        return s_simulator;
    }

    private static IStorefrontDao createStorefrontDao() {
        StorefrontDao dao = new StorefrontDao();
        dao.setSessionFactory(getOrCreateSessionFactory());
        return dao;
    }
    
    private static SessionFactory getOrCreateSessionFactory() {
        if (s_sessionFactory == null) {
            synchronized (s_configuration) {
                if (s_sessionFactory == null) {
                    s_sessionFactory = s_configuration.buildSessionFactory();
                    try {
                        // Ensure we have a valid database connection
                        s_sessionFactory.openSession().beginTransaction().rollback();
                    } catch (Exception e) {
                        s_sessionFactory = null;
                        throw (e instanceof RuntimeException) ? ((RuntimeException)e) : new RuntimeException(e);
                    }
                }
            }
        }
        return s_sessionFactory;
    }
}
