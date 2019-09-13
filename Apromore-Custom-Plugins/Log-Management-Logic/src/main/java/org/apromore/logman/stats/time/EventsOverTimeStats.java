package org.apromore.logman.stats.time;

import org.apromore.logman.LogManager;
import org.apromore.logman.event.LogFilteredEvent;
import org.apromore.logman.utils.LogUtils;
import org.deckfour.xes.model.XEvent;
import org.deckfour.xes.model.XLog;

public class EventsOverTimeStats extends TimeAwareStatsCollector {
	
	///////////////////////// Collect statistics the first time //////////////////////////////
	
	@Override 
	public void startVisit(LogManager logManager) {
		super.startVisit(logManager);
	}
	
	@Override
	public void visitLog(XLog log) {
		super.visitLog(log);
	}
	

	@Override
    public void visitEvent(XEvent event) {
    	int containingWindow = this.getContainingWindow(LogUtils.getTimestamp(event));
    	if (containingWindow > 0) {
    		this.values[containingWindow] = this.values[containingWindow] + 1; 
    	}
    }
	
	///////////////////////// Update statistics //////////////////////////////
	
    @Override
    public void onLogFiltered(LogFilteredEvent filterEvent) {
        for (XEvent e: filterEvent.getAllDeletedEvents()) {
        	int window = getContainingWindow(LogUtils.getTimestamp(e));
        	this.values[window] = this.values[window] - 1; 
        }
    }
}
